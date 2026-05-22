/**
 * Técnica: Boundary Value Analysis (B.2 em docs/TESTING-METHODOLOGIES.md)
 * Área alvo: POST /api/todos — campo `text`
 * Hipótese: O app não define um limite máximo para o campo `text`. Um payload
 *           de 100.000 chars deve ser aceito (ou rejeitado com 400 explícito),
 *           mas em nenhuma hipótese deve causar crash, timeout ou resposta
 *           malformada. Adicionalmente, texto de 1 char (boundary mínimo válido)
 *           deve ser aceito com 201 — garantindo que o limite inferior da classe
 *           válida também funciona.
 * Risco: Sem limite superior, cliente pode enviar payloads gigantes, causando
 *        aumento de memória no globalThis store, latência alta e potencial DoS.
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

describe("B.2 Boundary: tamanho do campo text em POST /api/todos", () => {
  test("texto de 1 char (limite mínimo válido) deve ser aceito com 201", async () => {
    const r = await api("POST", "/api/todos", { text: "x" });
    assert.equal(r.status, 201, `1 char deveria ser aceito — status: ${r.status}`);
    assert.ok(r.data?.todo?.id, "Deve retornar todo com id");
    assert.equal(r.data.todo.text, "x");
  });

  test("texto de 2 chars (limite+1 do mínimo) deve ser aceito com 201", async () => {
    const r = await api("POST", "/api/todos", { text: "ab" });
    assert.equal(r.status, 201);
  });

  test("texto de 10.000 chars deve ser aceito ou rejeitado de forma limpa (sem crash)", async () => {
    const text10k = "a".repeat(10_000);
    const r = await api("POST", "/api/todos", { text: text10k });
    // Sem limite definido no código, esperamos 201. Se houver limite, esperamos 400.
    // Em qualquer caso, não deve crashar (5xx) nem travar.
    assert.ok(
      r.status === 201 || r.status === 400,
      `10k chars: status esperado 201 ou 400, recebeu ${r.status}`
    );
    if (r.status === 201) {
      assert.equal(
        r.data.todo.text.length,
        10_000,
        "Todo criado deve preservar o texto completo"
      );
    }
  });

  test("texto de 100.000 chars deve ser aceito ou rejeitado de forma limpa (sem crash)", async () => {
    const text100k = "b".repeat(100_000);
    const r = await api("POST", "/api/todos", { text: text100k });
    assert.ok(
      r.status === 201 || r.status === 400,
      `100k chars: status esperado 201 ou 400, recebeu ${r.status}`
    );
  });

  test("texto de 100.001 chars (limite+1 se limite for 100k) deve ser tratado de forma limpa", async () => {
    const text100k1 = "c".repeat(100_001);
    const r = await api("POST", "/api/todos", { text: text100k1 });
    assert.ok(
      r.status === 201 || r.status === 400,
      `100001 chars: status esperado 201 ou 400, recebeu ${r.status}`
    );
    // Se aceitar 100k mas rejeitar 100k+1 seria o sinal de um limite bem definido.
    // Esse teste captura o boundary se o limite for introduzido futuramente.
  });
});
