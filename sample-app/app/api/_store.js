// In-memory store. Pinned em globalThis pra sobreviver à isolação de módulos
// que o Next 15 faz entre route handlers diferentes em dev.

const g = globalThis;
g.__claudeAgentsStore ||= {
  todos: [],
  nextTodoId: 1,
  users: [],
  nextUserId: 1,
  orders: [],
  nextOrderId: 1,
  sessions: new Map(),
  coupons: [
    { code: "PROMO10", discount: 10, type: "percent", expiresAt: "2099-12-31" },
    { code: "BLACK50", discount: 50, type: "fixed", expiresAt: "2026-12-31" },
    { code: "EXPIRED", discount: 5, type: "percent", expiresAt: "2024-01-01" },
  ],
};
const store = g.__claudeAgentsStore;

// ---------- todos ----------

export function listTodos() {
  return store.todos;
}

export function getTodo(id) {
  return store.todos.find((t) => t.id === id);
}

export function createTodo(text) {
  const todo = {
    id: store.nextTodoId++,
    text,
    done: false,
    createdAt: new Date().toISOString(),
  };
  store.todos.push(todo);
  return todo;
}

export function toggleTodo(id) {
  const t = store.todos.find((x) => x.id === id);
  if (!t) return null;
  t.done = !t.done;
  return t;
}

export function deleteTodo(id) {
  const before = store.todos.length;
  store.todos = store.todos.filter((t) => t.id !== id);
  return store.todos.length < before;
}

// ---------- users ----------

export function listUsers() {
  return store.users;
}

export function getUserByEmail(email) {
  return store.users.find((u) => u.email === email);
}

export function getUserById(id) {
  return store.users.find((u) => u.id === id);
}

export function createUser({ email, name, passwordHash }) {
  const u = {
    id: store.nextUserId++,
    email,
    name,
    passwordHash,
    createdAt: new Date().toISOString(),
  };
  store.users.push(u);
  return u;
}

// ---------- orders ----------

export function listOrders() {
  return store.orders;
}

export function getOrder(id) {
  return store.orders.find((o) => o.id === id);
}

export function createOrder(order) {
  const o = {
    id: store.nextOrderId++,
    ...order,
    createdAt: new Date().toISOString(),
  };
  store.orders.push(o);
  return o;
}

// ---------- sessions ----------

export function setSession(token, session) {
  for (const [t, s] of store.sessions.entries()) {
    if (s.userId === session.userId) store.sessions.delete(t);
  }
  store.sessions.set(token, session);
}

export function getSession(token) {
  return store.sessions.get(token);
}

export function deleteSession(token) {
  return store.sessions.delete(token);
}

// ---------- coupons ----------

export function getCoupon(code) {
  return store.coupons.find((c) => c.code === code);
}

export function listCoupons() {
  return store.coupons;
}

// ---------- reset ----------

export function _resetForTests() {
  store.todos = [];
  store.nextTodoId = 1;
  store.users = [];
  store.nextUserId = 1;
  store.orders = [];
  store.nextOrderId = 1;
  store.sessions.clear();
  store.coupons = [
    { code: "PROMO10", discount: 10, type: "percent", expiresAt: "2099-12-31" },
    { code: "BLACK50", discount: 50, type: "fixed", expiresAt: "2026-12-31" },
    { code: "EXPIRED", discount: 5, type: "percent", expiresAt: "2024-01-01" },
  ];
}
