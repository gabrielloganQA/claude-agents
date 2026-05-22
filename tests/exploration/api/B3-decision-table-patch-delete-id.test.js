/**
 * Técnica: Decision Table (B.3 em docs/TESTING-METHODOLOGIES.md)
 * Área alvo: PATCH /api/todos/[id] e DELETE /api/todos/[id]
 * Hipótese: A tabela de decisão para PATCH/DELETE cruza duas condições:
 *   {id existe no store?} × {id é um inteiro positivo válido?}
 *   Células que faltam na regressão atual:
 *     - id inexistente (inteiro válido mas fora do store) → 404
 *     - id negativo (-1, -999) → comportamento indefinido (provavelmente 404, mas pode ser 5xx)
 *     - id = 0 → comportamento indefinido
 *     - id não numérico ("abc") → Number("abc") = NaN, getTodo(NaN) usa `===` e NaN !== NaN,
 *       logo NUNCA encontra o todo. Esperamos 404, mas pode vazar stack trace.
 *     - id decimal ("1.5") → Number("1.5") = 1.5, getTodo(1.5) também nunca encontra
 *       (ids são inteiros), esperamos 404.
 * Risco: id não-numérico sendo passado para Number() sem validação prévia pode mascarar
 *        erros (silenciosamente retorna 404 em vez de 400) e dificulta debugging.
 *        Pior: se uma futura versão usar SQL, `WHERE id = NaN` pode ser injeção.
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

// ID que com certeza não existe no store (muito alto)
const NON_EXISTENT_ID = 999_999_999;

describe("B.3 Decision Table: PATCH em ids edge-case", () => {
  test("PATCH id inexistente (inteiro válido fora do store) → 404", async () => {
    const r = await api("PATCH", `/api/todos/${NON_EXISTENT_ID}`);
    assert.equal(r.status, 404, `ID ${NON_EXISTENT_ID} não deveria existir`);
    assert.ok(r.data?.error, "Deve retornar campo error na resposta");
  });

  test("PATCH id = 0 → 404 (id 0 nunca é criado, nextId começa em 1)", async () => {
    const r = await api("PATCH", "/api/todos/0");
    assert.equal(r.status, 404, "ID 0 nunca deveria existir no store");
  });

  test("PATCH id negativo (-1) → 404 ou 400 (nunca deve ser 200 ou 5xx)", async () => {
    const r = await api("PATCH", "/api/todos/-1");
    assert.ok(
      r.status === 404 || r.status === 400,
      `ID negativo deve retornar 404 ou 400, recebeu ${r.status}`
    );
    assert.notEqual(r.status, 200, "ID negativo nunca deve retornar 200");
    assert.ok(r.status < 500, `ID negativo não deve causar 5xx, recebeu ${r.status}`);
  });

  test("PATCH id não-numérico ('abc') → 404 ou 400 (nunca deve ser 5xx)", async () => {
    const r = await api("PATCH", "/api/todos/abc");
    // Number('abc') = NaN. getTodo(NaN): NaN !== NaN → find retorna undefined → 404
    // Comportamento silencioso: 404 em vez de 400 "id inválido"
    assert.ok(
      r.status === 404 || r.status === 400,
      `ID 'abc' deve retornar 404 ou 400, recebeu ${r.status}`
    );
    assert.ok(r.status < 500, `ID 'abc' não deve causar 5xx, recebeu ${r.status}`);
  });

  test("PATCH id decimal ('1.5') → 404 ou 400 (nunca deve ser 5xx)", async () => {
    const r = await api("PATCH", "/api/todos/1.5");
    // Number('1.5') = 1.5. getTodo(1.5): 1.5 nunca iguala um id inteiro
    assert.ok(
      r.status === 404 || r.status === 400,
      `ID '1.5' deve retornar 404 ou 400, recebeu ${r.status}`
    );
    assert.ok(r.status < 500, `ID '1.5' não deve causar 5xx, recebeu ${r.status}`);
  });
});

describe("B.3 Decision Table: DELETE em ids edge-case", () => {
  test("DELETE id inexistente (inteiro válido fora do store) → 404", async () => {
    const r = await api("DELETE", `/api/todos/${NON_EXISTENT_ID}`);
    assert.equal(r.status, 404, `DELETE de ID ${NON_EXISTENT_ID} não deveria encontrar nada`);
    assert.ok(r.data?.error, "Deve retornar campo error");
  });

  test("DELETE id = 0 → 404", async () => {
    const r = await api("DELETE", "/api/todos/0");
    assert.equal(r.status, 404);
  });

  test("DELETE id negativo (-1) → 404 ou 400 (nunca 5xx)", async () => {
    const r = await api("DELETE", "/api/todos/-1");
    assert.ok(
      r.status === 404 || r.status === 400,
      `DELETE ID negativo deve retornar 404 ou 400, recebeu ${r.status}`
    );
    assert.ok(r.status < 500, `DELETE ID negativo não deve causar 5xx`);
  });

  test("DELETE id não-numérico ('abc') → 404 ou 400 (nunca 5xx)", async () => {
    const r = await api("DELETE", "/api/todos/abc");
    assert.ok(
      r.status === 404 || r.status === 400,
      `DELETE 'abc' deve retornar 404 ou 400, recebeu ${r.status}`
    );
    assert.ok(r.status < 500, `DELETE 'abc' não deve causar 5xx, recebeu ${r.status}`);
  });
});
