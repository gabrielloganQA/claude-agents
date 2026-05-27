/**
 * Técnica: Statement/Branch/Function Coverage (A.1) + Equivalence Partitioning (B.1) + Error Guessing (B.8)
 * Referência: docs/TESTING-METHODOLOGIES.md seção A.1
 * Área: sample-app/app/api/orders/** — criação e consulta de pedidos
 *
 * Cobre os seguintes branches das rotas:
 *   POST /api/orders
 *     - Content-Type incorreto → 415
 *     - body com JSON inválido → 400
 *     - items ausente ou vazio → 400
 *     - sem cupom → calcula total sem desconto
 *     - com cupom válido (percent) → aplica desconto
 *     - com cupom válido (fixed) → aplica desconto fixo
 *     - com cupom expirado → ignora cupom
 *     - com cupom inexistente → ignora
 *   GET /api/orders — lista pedidos
 *   GET /api/orders/:id — pedido específico
 *     - id existente → 200
 *     - id inexistente → 404
 *
 * Isolamento: cada teste chama POST /api/testkit/reset (§A.1 TESTING-POLICY, §B.2).
 */

"use strict";

const { test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");

const BASE = process.env.API_BASE || "http://localhost:3000";

async function reset() {
  await fetch(`${BASE}/api/testkit/reset`, { method: "POST" });
}

async function api(method, path, body, headers = {}) {
  const defaultHeaders = body !== undefined ? { "Content-Type": "application/json" } : {};
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers: { ...defaultHeaders, ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await r.json();
  } catch {}
  return { status: r.status, data };
}

const ITEMS_VALID = [
  { sku: "SKU-001", name: "Produto A", price: 50, quantity: 2 },
];

// ---------------------------------------------------------------------------
// POST /api/orders — Content-Type
// ---------------------------------------------------------------------------

test("POST /api/orders sem Content-Type retorna 415", async () => {
  // Arrange
  await reset();

  // Act
  const r = await fetch(`${BASE}/api/orders`, {
    method: "POST",
    body: JSON.stringify({ items: ITEMS_VALID }),
  });

  // Assert
  assert.equal(r.status, 415, "POST sem Content-Type deve retornar 415");
});

// ---------------------------------------------------------------------------
// POST /api/orders — body inválido
// ---------------------------------------------------------------------------

test("POST /api/orders com JSON malformado retorna 400", async () => {
  // Arrange
  await reset();

  // Act
  const r = await fetch(`${BASE}/api/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{ isso nao e json }",
  });

  // Assert
  assert.equal(r.status, 400, "POST com JSON malformado deve retornar 400");
});

// ---------------------------------------------------------------------------
// POST /api/orders — items ausente ou vazio
// ---------------------------------------------------------------------------

test("POST /api/orders sem campo items retorna 400 [branch: !Array.isArray(items)]", async () => {
  // Arrange
  await reset();

  // Act
  const r = await api("POST", "/api/orders", { customerEmail: "a@example.test" });

  // Assert
  assert.equal(r.status, 400, "POST sem items deve retornar 400");
  assert.ok(r.data.error, "resposta deve ter campo error");
});

test("POST /api/orders com items vazio retorna 400 [branch: items.length === 0]", async () => {
  // Arrange
  await reset();

  // Act
  const r = await api("POST", "/api/orders", { items: [] });

  // Assert
  assert.equal(r.status, 400, "POST com items vazio deve retornar 400");
});

// ---------------------------------------------------------------------------
// POST /api/orders — caminho feliz sem cupom
// ---------------------------------------------------------------------------

test("POST /api/orders sem cupom cria pedido com desconto=0 e tax=10%", async () => {
  // Arrange
  await reset();
  const email = `qa-${Date.now()}-${randomUUID().slice(0, 8)}@example.test`;

  // Act
  const r = await api("POST", "/api/orders", {
    items: [{ sku: "A", name: "Produto A", price: 100, quantity: 1 }],
    customerEmail: email,
  });

  // Assert
  assert.equal(r.status, 201, "POST válido deve retornar 201");
  assert.ok(r.data.order, "resposta deve ter campo order");
  assert.equal(r.data.order.subtotal, 100, "subtotal deve ser 100");
  assert.equal(r.data.order.discount, 0, "discount deve ser 0 sem cupom");
  assert.equal(r.data.order.tax, 10, "tax deve ser 10% do subtotal");
  assert.equal(r.data.order.total, 110, "total = subtotal - discount + tax");
  assert.equal(r.data.order.customerEmail, email, "customerEmail deve ser preservado");
});

// ---------------------------------------------------------------------------
// POST /api/orders — com cupom válido tipo percent
// ---------------------------------------------------------------------------

test("POST /api/orders com cupom PROMO10 (10% percent) aplica desconto corretamente [branch: cupom válido, type=percent]", async () => {
  // Arrange
  await reset();

  // Act
  const r = await api("POST", "/api/orders", {
    items: [{ sku: "B", name: "Produto B", price: 200, quantity: 1 }],
    couponCode: "PROMO10",
  });

  // Assert
  assert.equal(r.status, 201, "POST com cupom válido deve retornar 201");
  assert.equal(r.data.order.subtotal, 200, "subtotal deve ser 200");
  assert.equal(r.data.order.discount, 20, "desconto 10% sobre 200 = 20");
  assert.equal(r.data.order.couponCode, "PROMO10", "couponCode deve ser registrado no pedido");
});

// ---------------------------------------------------------------------------
// POST /api/orders — com cupom válido tipo fixed
// ---------------------------------------------------------------------------

test("POST /api/orders com cupom BLACK50 (fixed R$50) aplica desconto fixo [branch: type=fixed]", async () => {
  // Arrange
  await reset();

  // Act
  const r = await api("POST", "/api/orders", {
    items: [{ sku: "C", name: "Produto C", price: 300, quantity: 1 }],
    couponCode: "BLACK50",
  });

  // Assert
  assert.equal(r.status, 201, "POST com cupom fixed deve retornar 201");
  assert.equal(r.data.order.discount, 50, "desconto fixo BLACK50 deve ser 50");
  assert.equal(r.data.order.couponCode, "BLACK50", "couponCode deve ser BLACK50");
});

// ---------------------------------------------------------------------------
// POST /api/orders — cupom expirado (deve ser ignorado)
// ---------------------------------------------------------------------------

test("POST /api/orders com cupom EXPIRED ignora cupom e não aplica desconto [branch: !isCouponValid]", async () => {
  // Arrange
  await reset();

  // Act
  const r = await api("POST", "/api/orders", {
    items: [{ sku: "D", name: "Produto D", price: 100, quantity: 1 }],
    couponCode: "EXPIRED",
  });

  // Assert
  assert.equal(r.status, 201, "POST com cupom expirado deve retornar 201 (cupom ignorado)");
  assert.equal(
    r.data.order.discount,
    0,
    "cupom expirado deve ser ignorado (desconto=0)"
  );
  assert.equal(
    r.data.order.couponCode,
    null,
    "couponCode deve ser null quando cupom expirado é ignorado"
  );
});

// ---------------------------------------------------------------------------
// POST /api/orders — cupom inexistente
// ---------------------------------------------------------------------------

test("POST /api/orders com cupom inexistente ignora e cria pedido sem desconto [branch: !coupon após getCoupon]", async () => {
  // Arrange
  await reset();

  // Act
  const r = await api("POST", "/api/orders", {
    items: [{ sku: "E", name: "Produto E", price: 50, quantity: 1 }],
    couponCode: "CUPOM-QUE-NAO-EXISTE",
  });

  // Assert
  assert.equal(r.status, 201, "POST com cupom inexistente deve retornar 201");
  assert.equal(r.data.order.discount, 0, "cupom inexistente não deve gerar desconto");
  assert.equal(r.data.order.couponCode, null, "couponCode deve ser null para cupom inexistente");
});

// ---------------------------------------------------------------------------
// GET /api/orders — lista pedidos
// ---------------------------------------------------------------------------

test("GET /api/orders retorna lista de pedidos criados", async () => {
  // Arrange
  await reset();
  await api("POST", "/api/orders", {
    items: [{ sku: "F", name: "Produto F", price: 10, quantity: 1 }],
  });

  // Act
  const r = await api("GET", "/api/orders");

  // Assert
  assert.equal(r.status, 200, "GET /api/orders deve retornar 200");
  assert.ok(Array.isArray(r.data.orders), "resposta deve ter campo orders (array)");
  assert.equal(r.data.orders.length, 1, "deve haver 1 pedido na lista");
});

// ---------------------------------------------------------------------------
// GET /api/orders/:id — pedido específico
// ---------------------------------------------------------------------------

test("GET /api/orders/:id retorna pedido existente com 200 [branch: order encontrado]", async () => {
  // Arrange
  await reset();
  const created = await api("POST", "/api/orders", {
    items: [{ sku: "G", name: "Produto G", price: 20, quantity: 2 }],
  });
  const orderId = created.data.order.id;

  // Act
  const r = await api("GET", `/api/orders/${orderId}`);

  // Assert
  assert.equal(r.status, 200, "GET /api/orders/:id deve retornar 200 para pedido existente");
  assert.equal(r.data.order.id, orderId, "id do pedido deve bater");
});

test("GET /api/orders/:id retorna 404 para id inexistente [branch: !order]", async () => {
  // Arrange
  await reset();

  // Act
  const r = await api("GET", "/api/orders/99999");

  // Assert
  assert.equal(r.status, 404, "GET /api/orders/:id inexistente deve retornar 404");
  assert.ok(r.data.error, "resposta de 404 deve ter campo error");
});
