/**
 * Técnica: Error Guessing (B.8 em docs/TESTING-METHODOLOGIES.md)
 * Área alvo: POST /api/todos — parsing do body e tipos de entrada não previstos
 * Hipótese: O handler faz `req.json().catch(() => ({}))` — qualquer body não-JSON
 *   silenciosamente vira `{}`, e `body?.text` = undefined → 400 "text obrigatório".
 *   Mas e se o body for JSON válido mas com tipos errados?
 *   - `text: null` → typeof null !== "string" → 400 ✓ (mas vale confirmar)
 *   - `text: 123` → typeof 123 !== "string" → 400 ✓ (mas vale confirmar)
 *   - `text: ["array"]` → typeof array === "object" → 400 ✓
 *   - `text: true` → typeof true === "boolean" → 400 ✓
 *   - body sem Content-Type (text/plain) → Next.js pode rejeitar antes do handler
 *   - body com JSON malformado → catch retorna {} → 400
 *   - `text: "  texto com espaços antes e depois  "` → trim() → deve valer como válido
 *   - campo extra desconhecido junto com text válido → deve ignorar extra e aceitar
 * Risco: Tipo errado no campo text poderia contornar validação em framework futuro.
 *   Body sem Content-Type pode resultar em comportamento undefined em próximas versões do Next.
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

async function rawPost(body, contentType) {
  const headers = {};
  if (contentType) headers["Content-Type"] = contentType;
  const r = await fetch(`${BASE}/api/todos`, {
    method: "POST",
    headers,
    body,
  });
  let data = null;
  try {
    data = await r.json();
  } catch {}
  return { status: r.status, data };
}

describe("B.8 Error Guessing: tipos inválidos no campo text de POST /api/todos", () => {
  test("text: null → 400 (typeof null !== 'string')", async () => {
    const r = await api("POST", "/api/todos", { text: null });
    assert.equal(r.status, 400, `text=null deve ser rejeitado com 400, recebeu ${r.status}`);
  });

  test("text: 123 (número) → 400 (typeof 123 !== 'string')", async () => {
    const r = await api("POST", "/api/todos", { text: 123 });
    assert.equal(r.status, 400, `text=123 deve ser rejeitado com 400, recebeu ${r.status}`);
  });

  test("text: true (boolean) → 400", async () => {
    const r = await api("POST", "/api/todos", { text: true });
    assert.equal(r.status, 400, `text=true deve ser rejeitado com 400, recebeu ${r.status}`);
  });

  test("text: [] (array vazio) → 400", async () => {
    const r = await api("POST", "/api/todos", { text: [] });
    assert.equal(r.status, 400, `text=[] deve ser rejeitado com 400, recebeu ${r.status}`);
  });

  test("text: {} (objeto) → 400", async () => {
    const r = await api("POST", "/api/todos", { text: {} });
    assert.equal(r.status, 400, `text={} deve ser rejeitado com 400, recebeu ${r.status}`);
  });

  test("body com JSON malformado (não-JSON raw) → 400 (catch retorna {})", async () => {
    const r = await rawPost("{ texto: invalido }", "application/json");
    assert.equal(r.status, 400, `JSON malformado deve resultar em 400, recebeu ${r.status}`);
    assert.ok(r.status < 500, "JSON malformado não deve causar 5xx");
  });

  test("body sem Content-Type → 400 ou 415 (nunca 5xx)", async () => {
    // Next.js pode rejeitar body sem Content-Type com 415 Unsupported Media Type
    // ou o handler pode tentar parsear e falhar, resultando em 400
    const r = await rawPost('{"text":"teste sem content-type"}', undefined);
    assert.ok(
      r.status === 400 || r.status === 415,
      `Sem Content-Type: status esperado 400 ou 415, recebeu ${r.status}`
    );
    assert.ok(r.status < 500, `Sem Content-Type não deve causar 5xx, recebeu ${r.status}`);
  });
});

describe("B.8 Error Guessing: casos edge válidos em POST /api/todos", () => {
  test("texto com espaços nos extremos mas conteúdo no meio → deve ser aceito com 201", async () => {
    // trim() é chamado só para verificar se não é TUDO espaços; o texto original é salvo
    const r = await api("POST", "/api/todos", { text: "  texto valido  " });
    assert.equal(r.status, 201, `Texto com espaços nas bordas deve ser aceito, recebeu ${r.status}`);
    assert.ok(r.data?.todo?.id, "Deve retornar todo com id");
    // O texto salvo pode ser com ou sem trim — verificamos que foi salvo algo
    assert.ok(r.data.todo.text.includes("texto valido"), "Texto deve conter o conteúdo original");
  });

  test("campo extra desconhecido junto com text válido → deve ser ignorado, retornar 201", async () => {
    const r = await api("POST", "/api/todos", {
      text: "todo valido",
      campoExtra: "ignorar",
      outroExtra: 99,
    });
    assert.equal(r.status, 201, `Campo extra não deve afetar criação, recebeu ${r.status}`);
    assert.ok(r.data?.todo?.id, "Deve retornar todo com id");
    assert.equal(r.data.todo.text, "todo valido");
    // Campo extra NÃO deve aparecer no todo retornado (contaminação do objeto)
    assert.equal(
      r.data.todo.campoExtra,
      undefined,
      "Campo extra não deve vazar para o todo retornado"
    );
  });
});
