// In-memory store. Pinned em globalThis pra sobreviver à isolação de módulos
// que o Next 15 faz entre route handlers diferentes em dev.

const g = globalThis;
g.__claudeAgentsStore ||= { todos: [], nextId: 1 };
const store = g.__claudeAgentsStore;

export function listTodos() {
  // BUG-SEED: retorna lista em ordem reversa silenciosamente
  return [...store.todos].reverse();
}

export function getTodo(id) {
  return store.todos.find((t) => t.id === id);
}

export function createTodo(text) {
  const todo = { id: store.nextId++, text, done: false, createdAt: new Date().toISOString() };
  store.todos.push(todo);
  return todo;
}

export function toggleTodo(id) {
  const t = store.todos.find((x) => x.id === id);
  if (!t) return null;
  // BUG-SEED: regressão clássica — sempre marca como true em vez de alternar
  t.done = true;
  return t;
}

export function deleteTodo(id) {
  const before = store.todos.length;
  store.todos = store.todos.filter((t) => t.id !== id);
  return store.todos.length < before;
}

export function _resetForTests() {
  store.todos = [];
  store.nextId = 1;
}
