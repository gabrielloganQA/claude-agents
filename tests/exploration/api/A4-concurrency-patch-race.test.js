/**
 * Técnica: Loop Testing / Concurrency (A.4 em docs/TESTING-METHODOLOGIES.md)
 * Área alvo: PATCH /api/todos/[id] — múltiplas requisições simultâneas no mesmo id
 * Hipótese: O store em memória usa `t.done = !t.done` (mutação direta no objeto).
 *   Node.js é single-threaded, então race conditions clássicas não ocorrem.
 *   Porém, com N PATCHes simultâneos em um único todo, o resultado final deve ser
 *   determinístico: N PATCHes alternados em um todo com done=false inicial deve resultar
 *   em done = (N % 2 === 1). Se o app processa em ordem diferente ou
 *   o servidor tiver múltiplos workers, pode haver divergência.
 *   Também testamos: 2 POSTs simultâneos (race no nextId++ — o contador não é atômico
 *   em ambientes multi-worker, mas em dev single-worker deve gerar ids únicos).
 * Risco: Em produção com múltiplos workers (PM2, Kubernetes), o globalThis store não é
 *   compartilhado entre processos → cada worker tem seu próprio store → ids colidem.
 *   Esse teste documenta o comportamento esperado em single-worker (dev).
 * Gerado por: qa-explorer em 2026-05-22
 */

const { test, describe, before } = require("node:test");
const assert = require("node:assert/strict");

const BASE = process.env.API_BASE || "http://localhost:3000";

async function api(method, path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await r.json();
  } catch {}
  return { status: r.status, data };
}

describe("A.4 Concurrency: PATCHes simultâneos no mesmo todo", () => {
  test("2 PATCHes simultâneos em um todo → done deve ser false (2 toggles = volta ao início)", async () => {
    // Cria um todo limpo com done=false
    const created = await api("POST", "/api/todos", { text: `concurrency-2patch-${Date.now()}` });
    assert.equal(created.status, 201);
    const id = created.data.todo.id;
    assert.equal(created.data.todo.done, false, "Deve começar com done=false");

    // Envia 2 PATCHes simultâneos
    const [r1, r2] = await Promise.all([
      api("PATCH", `/api/todos/${id}`),
      api("PATCH", `/api/todos/${id}`),
    ]);

    assert.equal(r1.status, 200, "Primeiro PATCH deve retornar 200");
    assert.equal(r2.status, 200, "Segundo PATCH deve retornar 200");

    // Verifica estado final consistente: 2 toggles → done=false
    const final = await api("GET", `/api/todos/${id}`);
    assert.equal(final.status, 200);
    assert.equal(
      final.data.todo.done,
      false,
      `Após 2 PATCHes simultâneos, done deve ser false (volta ao estado inicial). Recebeu: ${final.data.todo.done}`
    );
  });

  test("10 PATCHes simultâneos em um todo → done deve ser true (10 é ímpar? não — 10 é par → false)", async () => {
    const created = await api("POST", "/api/todos", { text: `concurrency-10patch-${Date.now()}` });
    assert.equal(created.status, 201);
    const id = created.data.todo.id;

    // 10 PATCHes simultâneos — número par → deve voltar a done=false
    const patches = Array.from({ length: 10 }, () => api("PATCH", `/api/todos/${id}`));
    const results = await Promise.all(patches);

    const failed = results.filter((r) => r.status !== 200);
    assert.equal(failed.length, 0, `Todos os 10 PATCHes devem retornar 200. Falhou: ${failed.length}`);

    const final = await api("GET", `/api/todos/${id}`);
    assert.equal(
      final.data.todo.done,
      false,
      `Após 10 PATCHes (par), done deve ser false. Recebeu: ${final.data.todo.done}`
    );
  });
});

describe("A.4 Concurrency: POSTs simultâneos (race no nextId)", () => {
  test("20 POSTs simultâneos devem gerar 20 todos com ids únicos", async () => {
    const tag = `race-${Date.now()}`;
    const posts = Array.from({ length: 20 }, (_, i) =>
      api("POST", "/api/todos", { text: `${tag}-${i}` })
    );
    const results = await Promise.all(posts);

    const failed = results.filter((r) => r.status !== 201);
    assert.equal(
      failed.length,
      0,
      `Todos os 20 POSTs devem retornar 201. Falhou: ${failed.length}`
    );

    const ids = results.map((r) => r.data.todo.id);
    const uniqueIds = new Set(ids);
    assert.equal(
      uniqueIds.size,
      20,
      `Todos os 20 todos devem ter ids únicos. Ids únicos: ${uniqueIds.size}. Ids: ${ids.join(",")}`
    );
  });
});
