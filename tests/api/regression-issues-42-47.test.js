/**
 * Regression tests — garantem que os bugs documentados em #42-#47 (achados via
 * /qa-run contra a branch chore/seed-test-bugs) nunca voltem em silêncio na main.
 *
 * Cada test referencia explicitamente a issue que cobre.
 *
 * Técnicas aplicadas (ver docs/TESTING-METHODOLOGIES.md):
 *   - B.1 Equivalence Partitioning
 *   - B.3 Decision Table
 *   - B.4 State Transition
 *   - B.8 Error Guessing
 */

const { test } = require("node:test");
const assert = require("node:assert/strict");

const BASE = process.env.API_BASE || "http://localhost:3000";

async function api(method, path, body, headers) {
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers: headers ?? (body ? { "Content-Type": "application/json" } : undefined),
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await r.json();
  } catch {}
  return { status: r.status, data };
}

// === Issue #42 — toggleTodo deve alternar, não fixar em true ===
// Técnica: B.4 State Transition (todo passa por done=false → true → false → true)
test("#42 — toggle 3x alterna o estado: false → true → false → true", async () => {
  const created = await api("POST", "/api/todos", { text: "toggle-regression-" + Date.now() });
  assert.equal(created.status, 201);
  const id = created.data.todo.id;
  assert.equal(created.data.todo.done, false, "criado deve começar com done=false");

  const t1 = await api("PATCH", `/api/todos/${id}`);
  assert.equal(t1.data.todo.done, true, "1º toggle: false → true");

  const t2 = await api("PATCH", `/api/todos/${id}`);
  assert.equal(t2.data.todo.done, false, "2º toggle: true → false (regressão #42: ficava em true)");

  const t3 = await api("PATCH", `/api/todos/${id}`);
  assert.equal(t3.data.todo.done, true, "3º toggle: false → true");
});

// === Issue #43 — POST sem Content-Type application/json deve retornar 415 ===
// Técnica: B.3 Decision Table (Content-Type x body válido)
test("#43 — POST sem Content-Type retorna 415", async () => {
  const r = await fetch(`${BASE}/api/todos`, {
    method: "POST",
    body: JSON.stringify({ text: "qualquer" }),
  });
  assert.equal(r.status, 415, "deveria rejeitar request sem Content-Type");
});

test("#43 — POST com Content-Type text/plain retorna 415", async () => {
  const r = await fetch(`${BASE}/api/todos`, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: "text=algo",
  });
  assert.equal(r.status, 415, "Content-Type não-JSON deveria ser rejeitado");
});

// === Issue #44 — POST não pode aceitar texto vazio nem só espaços ===
// Técnica: B.1 Equivalence Partitioning (classe inválida — texto sem conteúdo útil)
test("#44 — POST com text=\"\" retorna 400", async () => {
  const r = await api("POST", "/api/todos", { text: "" });
  assert.equal(r.status, 400);
});

test("#44 — POST com text=\"   \" (só espaços) retorna 400", async () => {
  const r = await api("POST", "/api/todos", { text: "   " });
  assert.equal(r.status, 400);
});

test("#44 — POST com text=\"\\t\\n\\r\" (só whitespace) retorna 400", async () => {
  const r = await api("POST", "/api/todos", { text: "\t\n\r" });
  assert.equal(r.status, 400);
});

// === Issue #45 — DELETE em id inexistente deve retornar 404, não 200 ===
// Técnica: B.8 Error Guessing
test("#45 — DELETE em id que nunca existiu retorna 404", async () => {
  const r = await api("DELETE", "/api/todos/999999999");
  assert.equal(r.status, 404, "id inexistente deveria 404 (regressão #45: retornava 200)");
});

test("#45 — DELETE em id já deletado retorna 404 (idempotência)", async () => {
  const created = await api("POST", "/api/todos", { text: "del-idem-" + Date.now() });
  const id = created.data.todo.id;

  const d1 = await api("DELETE", `/api/todos/${id}`);
  assert.equal(d1.status, 200, "primeira deleção deve dar 200");

  const d2 = await api("DELETE", `/api/todos/${id}`);
  assert.equal(d2.status, 404, "segunda deleção deve dar 404 (id já não existe)");
});

// === Issue #46 — listTodos deve preservar ordem de inserção ===
// Técnica: B.4 State Transition (ordem é parte do estado observável)
test("#46 — GET /api/todos retorna em ordem de inserção (não reversa)", async () => {
  // Cria 3 todos com texto único pra identificar ordem
  const stamp = Date.now();
  const t1 = await api("POST", "/api/todos", { text: `order-1-${stamp}` });
  const t2 = await api("POST", "/api/todos", { text: `order-2-${stamp}` });
  const t3 = await api("POST", "/api/todos", { text: `order-3-${stamp}` });

  const list = await api("GET", "/api/todos");
  // Filtra só os 3 que acabamos de criar — outros tests podem estar deixando ruído
  const ours = list.data.todos.filter((t) =>
    [t1.data.todo.id, t2.data.todo.id, t3.data.todo.id].includes(t.id),
  );

  assert.equal(ours.length, 3, "3 todos criados, 3 todos esperados");
  assert.equal(ours[0].id, t1.data.todo.id, "primeiro inserido deve aparecer primeiro");
  assert.equal(ours[1].id, t2.data.todo.id, "segundo inserido deve aparecer em segundo");
  assert.equal(ours[2].id, t3.data.todo.id, "terceiro inserido deve aparecer por último");
});

// === Issue #47 — bugs de UI (h1→div, aria-label, ortografia) ===
// Esses bugs vivem em page.js e layout.js. Sem Playwright funcional aqui,
// fazemos checagem estática indireta: o HTML inicial renderizado pelo Next deve
// conter os marcadores esperados.
test("#47 — homepage HTML contém <h1>TODO App</h1>", async () => {
  const r = await fetch(`${BASE}/`);
  assert.equal(r.status, 200);
  const html = await r.text();
  assert.ok(html.includes("<h1>TODO App</h1>"), "deve renderizar <h1>TODO App</h1>");
  assert.ok(!html.includes("TOOD App"), "não deve conter typo 'TOOD App'");
  assert.ok(!html.includes("Adcionar"), "não deve conter typo 'Adcionar'");
  assert.ok(!html.includes("Remoover"), "não deve conter typo 'Remoover'");
  assert.ok(!html.includes("percisa"), "não deve conter typo 'percisa'");
});

test("#47 — input do form tem aria-label", async () => {
  const r = await fetch(`${BASE}/`);
  const html = await r.text();
  assert.ok(
    /aria-label="Novo TODO"/.test(html),
    "input principal deve ter aria-label='Novo TODO'",
  );
});

test("#47 — <html> tem lang='pt-BR'", async () => {
  const r = await fetch(`${BASE}/`);
  const html = await r.text();
  assert.ok(/<html[^>]*lang="pt-BR"/.test(html), "html deve declarar lang=pt-BR (WCAG 3.1.1)");
});
