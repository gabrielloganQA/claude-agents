/**
 * Técnica: Branch / Decision Coverage (A.1 em docs/TESTING-METHODOLOGIES.md)
 * Área alvo: POST /api/todos + _store.js createTodo / GET /api/todos/[id]
 * Hipótese: Analisando os branches do código-fonte:
 *
 *   POST route.js:
 *     Branch 1: typeof text !== "string" → true (rejeit) / false (aceita)
 *     Branch 2: text.trim() === "" → true (rejeita) / false (aceita)
 *     A regressão cobre parcialmente (vazio + espaços). Faltam:
 *       - body sem campo `text` (undefined → typeof undefined !== "string" → Branch 1 = true)
 *       - body vazio {} (mesma coisa)
 *       - text é string mas de um único espaço " " → trim = "" → Branch 2 = true
 *       - text é string com \t ou \n → trim remove tabulação/nova linha → Branch 2 = true
 *
 *   GET /api/todos/[id] route.js:
 *     Branch 1: !todo → true (404) / false (200)
 *     A regressão só cobre o caminho false (200). Falta:
 *       - GET id existente → 200 (coberto)
 *       - GET id inexistente → 404 (NÃO coberto em tests/api/todos.test.js — DELETE testa,
 *         mas GET direto em id inexistente não tem teste específico)
 *
 *   Risco: Branch coverage incompleto significa que linhas do handler de erro
 *   podem nunca ter sido executadas em teste — mascara bugs nessas linhas.
 * Gerado por: qa-explorer em 2026-05-22
 */

const { test, describe } = require("node:test");
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

describe("A.1 Branch Coverage: POST /api/todos — branches de validação", () => {
  test("body sem campo text (undefined) → Branch 1=true → 400", async () => {
    // typeof undefined !== "string" → rejeita
    const r = await api("POST", "/api/todos", { outroCampo: "valor" });
    assert.equal(r.status, 400, `Body sem campo text deve retornar 400, recebeu ${r.status}`);
    assert.ok(r.data?.error, "Deve ter campo error na resposta");
  });

  test("body completamente vazio {} → Branch 1=true → 400", async () => {
    const r = await api("POST", "/api/todos", {});
    assert.equal(r.status, 400, `Body {} deve retornar 400, recebeu ${r.status}`);
  });

  test("text = ' ' (único espaço) → Branch 1=false, Branch 2=true → 400", async () => {
    // typeof " " === "string" → Branch 1=false
    // " ".trim() === "" → Branch 2=true → rejeita
    const r = await api("POST", "/api/todos", { text: " " });
    assert.equal(r.status, 400, `text=' ' (espaço) deve retornar 400, recebeu ${r.status}`);
  });

  test("text com tab '\\t' → Branch 2=true → 400 (trim remove tab)", async () => {
    const r = await api("POST", "/api/todos", { text: "\t" });
    assert.equal(r.status, 400, `text='\\t' deve retornar 400 (trim remove tab), recebeu ${r.status}`);
  });

  test("text com nova linha '\\n' → Branch 2=true → 400", async () => {
    const r = await api("POST", "/api/todos", { text: "\n" });
    assert.equal(r.status, 400, `text='\\n' deve retornar 400, recebeu ${r.status}`);
  });

  test("text = '\\t\\n   \\r' (mix de whitespace) → Branch 2=true → 400", async () => {
    const r = await api("POST", "/api/todos", { text: "\t\n   \r" });
    assert.equal(r.status, 400, `Whitespace misto deve retornar 400, recebeu ${r.status}`);
  });
});

describe("A.1 Branch Coverage: GET /api/todos/[id] — branch not-found", () => {
  test("GET id inexistente (999999998) → Branch 1=true → 404", async () => {
    const r = await api("GET", "/api/todos/999999998");
    assert.equal(r.status, 404, `GET id inexistente deve retornar 404, recebeu ${r.status}`);
    assert.ok(r.data?.error, "Deve ter campo error");
  });

  test("GET id existente → Branch 1=false → 200 com todo completo", async () => {
    const created = await api("POST", "/api/todos", { text: `branch-get-${Date.now()}` });
    assert.equal(created.status, 201);
    const id = created.data.todo.id;

    const r = await api("GET", `/api/todos/${id}`);
    assert.equal(r.status, 200);
    assert.ok(r.data?.todo, "Deve retornar objeto todo");
    assert.equal(r.data.todo.id, id);
    assert.equal(typeof r.data.todo.text, "string");
    assert.equal(typeof r.data.todo.done, "boolean");
    assert.equal(typeof r.data.todo.createdAt, "string");
  });
});
