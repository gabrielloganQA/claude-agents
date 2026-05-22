/**
 * Técnica: Equivalence Partitioning (B.1) + State Transition (B.4)
 * Área: POST /api/todos/reset, GET /api/todos/reset
 * Hipótese: Após POST /reset com qualquer estado prévio (vazio ou com items),
 *           a lista volta a [] e nextId reseta. GET /reset retorna a contagem
 *           atual sem efeitos colaterais.
 * Risco: endpoint de reset não-validado pode ser invocado por engano em prod
 *        e apagar dados reais. Deveria existir só em dev/test.
 * Gerado por: qa-pre-pr em 2026-05-16 pra branch test/pre-pr-check-demo
 */

const { test } = require("node:test");
const assert = require("node:assert/strict");

const BASE = process.env.API_BASE || "http://localhost:3000";

async function api(method, path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await r.json(); } catch {}
  return { status: r.status, data };
}

test("GET /api/todos/reset retorna contagem sem alterar estado", async () => {
  await api("POST", "/api/todos/reset"); // garante baseline limpo
  const empty = await api("GET", "/api/todos/reset");
  assert.equal(empty.status, 200);
  assert.equal(empty.data.count, 0);

  await api("POST", "/api/todos", { text: "checagem" });
  const after = await api("GET", "/api/todos/reset");
  assert.equal(after.data.count, 1);
});

test("POST /api/todos/reset zera lista mesmo com items", async () => {
  await api("POST", "/api/todos", { text: "a" });
  await api("POST", "/api/todos", { text: "b" });
  const before = await api("GET", "/api/todos");
  assert.ok(before.data.todos.length >= 2);

  const r = await api("POST", "/api/todos/reset");
  assert.equal(r.status, 200);
  assert.equal(r.data.ok, true);
  assert.equal(r.data.count, 0);

  const after = await api("GET", "/api/todos");
  assert.deepEqual(after.data.todos, []);
});

test("POST /api/todos/reset em lista vazia é idempotente", async () => {
  await api("POST", "/api/todos/reset");
  const r = await api("POST", "/api/todos/reset");
  assert.equal(r.status, 200);
  assert.equal(r.data.count, 0);
});
