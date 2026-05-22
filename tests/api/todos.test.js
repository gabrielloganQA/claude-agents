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
  try {
    data = await r.json();
  } catch {}
  return { status: r.status, data };
}

test("POST /api/todos sem Content-Type retorna 415", async () => {
  const r = await fetch(`${BASE}/api/todos`, {
    method: "POST",
    body: JSON.stringify({ text: "sem-content-type" }),
  });
  assert.equal(r.status, 415, "Ausência de Content-Type deveria retornar 415");
});

test("POST /api/todos com Content-Type errado retorna 415", async () => {
  const r = await fetch(`${BASE}/api/todos`, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify({ text: "content-type-errado" }),
  });
  assert.equal(r.status, 415, "Content-Type incorreto deveria retornar 415");
});

test("POST /api/todos rejeita texto vazio com 400", async () => {
  const r = await api("POST", "/api/todos", { text: "" });
  assert.equal(r.status, 400, "Texto vazio deveria ser rejeitado");
});

test("POST /api/todos rejeita texto que é só espaços", async () => {
  const r = await api("POST", "/api/todos", { text: "   " });
  assert.equal(r.status, 400, "Texto só com espaços deveria ser rejeitado");
});

test("POST + GET cria e lista TODO", async () => {
  const created = await api("POST", "/api/todos", { text: "test-todo-" + Date.now() });
  assert.equal(created.status, 201);
  assert.ok(created.data.todo.id);

  const listed = await api("GET", "/api/todos");
  assert.equal(listed.status, 200);
  assert.ok(listed.data.todos.find((t) => t.id === created.data.todo.id));
});

test("PATCH alterna o estado done (toggle)", async () => {
  const created = await api("POST", "/api/todos", { text: "toggle-" + Date.now() });
  const id = created.data.todo.id;

  const first = await api("PATCH", `/api/todos/${id}`);
  assert.equal(first.data.todo.done, true, "Primeiro toggle deveria marcar done=true");

  const second = await api("PATCH", `/api/todos/${id}`);
  assert.equal(second.data.todo.done, false, "Segundo toggle deveria marcar done=false (alternar)");
});

test("DELETE remove o TODO", async () => {
  const created = await api("POST", "/api/todos", { text: "delete-" + Date.now() });
  const id = created.data.todo.id;
  const del = await api("DELETE", `/api/todos/${id}`);
  assert.equal(del.status, 200);

  const after = await api("GET", `/api/todos/${id}`);
  assert.equal(after.status, 404);
});
