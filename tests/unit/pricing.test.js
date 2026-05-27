/**
 * Técnica: Statement/Branch/Function Coverage (A.1) + Equivalence Partitioning (B.1) + Boundary Value Analysis (B.2)
 * Referência: docs/TESTING-METHODOLOGIES.md seção A.1
 * Área: sample-app/app/lib/pricing.js — lógica pura de cálculo de pedidos
 *
 * Cobre todos os branches de:
 *   - lineTotal, subtotal
 *   - applyCoupon (sem cupom, tipo "percent", tipo "fixed")
 *   - calcTax
 *   - calculateTotal
 *   - isCouponValid (sem cupom, expirado, válido)
 */

"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

// Importa a lib de produção diretamente para cobertura unit
const pricingPath = path.resolve(
  __dirname,
  "../../sample-app/app/lib/pricing.js",
);

// Node CJS não pode importar ESM diretamente — usa import()
async function loadPricing() {
  return await import(pricingPath);
}

// -------------------------------------------------------------------------
// lineTotal
// -------------------------------------------------------------------------

test("lineTotal — multiplica price por quantity corretamente", async () => {
  // Arrange
  const { lineTotal } = await loadPricing();
  const item = { price: 10, quantity: 3 };

  // Act
  const result = lineTotal(item);

  // Assert
  assert.equal(result, 30, "lineTotal deve retornar price * quantity");
});

test("lineTotal — retorna 0 quando quantity é zero", async () => {
  // Arrange
  const { lineTotal } = await loadPricing();
  const item = { price: 99.99, quantity: 0 };

  // Act
  const result = lineTotal(item);

  // Assert
  assert.equal(result, 0, "lineTotal com quantity=0 deve retornar 0");
});

// -------------------------------------------------------------------------
// subtotal
// -------------------------------------------------------------------------

test("subtotal — soma lineTotals de múltiplos itens", async () => {
  // Arrange
  const { subtotal } = await loadPricing();
  const items = [
    { price: 10, quantity: 2 },
    { price: 5, quantity: 4 },
  ];

  // Act
  const result = subtotal(items);

  // Assert
  assert.equal(result, 40, "subtotal deve somar todos os lineTotals (20 + 20)");
});

test("subtotal — lista vazia retorna 0", async () => {
  // Arrange
  const { subtotal } = await loadPricing();

  // Act
  const result = subtotal([]);

  // Assert
  assert.equal(result, 0, "subtotal de lista vazia deve ser 0");
});

// -------------------------------------------------------------------------
// applyCoupon
// -------------------------------------------------------------------------

test("applyCoupon — sem cupom retorna 0 [branch: !coupon]", async () => {
  // Arrange
  const { applyCoupon } = await loadPricing();

  // Act
  const result = applyCoupon(100, null);

  // Assert
  assert.equal(result, 0, "applyCoupon sem cupom deve retornar desconto 0");
});

test("applyCoupon — cupom tipo percent aplica percentual sobre subtotal [branch: type=percent]", async () => {
  // Arrange
  const { applyCoupon } = await loadPricing();
  const coupon = { type: "percent", discount: 10 };

  // Act
  const result = applyCoupon(200, coupon);

  // Assert
  assert.equal(result, 20, "cupom 10% sobre 200 deve descontar 20");
});

test("applyCoupon — cupom tipo fixed retorna valor fixo [branch: type!=percent]", async () => {
  // Arrange
  const { applyCoupon } = await loadPricing();
  const coupon = { type: "fixed", discount: 50 };

  // Act
  const result = applyCoupon(200, coupon);

  // Assert
  assert.equal(result, 50, "cupom fixo de 50 deve retornar desconto de 50");
});

// -------------------------------------------------------------------------
// calcTax
// -------------------------------------------------------------------------

test("calcTax — aplica TAX_RATE (10%) sobre o valor informado", async () => {
  // Arrange
  const { calcTax, TAX_RATE } = await loadPricing();

  // Act
  const result = calcTax(100);

  // Assert
  assert.equal(
    result,
    100 * TAX_RATE,
    "calcTax deve ser subtotal * TAX_RATE (10%)",
  );
});

// -------------------------------------------------------------------------
// calculateTotal
// -------------------------------------------------------------------------

test("calculateTotal — sem cupom calcula subtotal, tax=10% e total correto", async () => {
  // Arrange
  const { calculateTotal } = await loadPricing();
  const items = [{ price: 100, quantity: 1 }];

  // Act
  const result = calculateTotal({ items, coupon: null });

  // Assert
  assert.equal(result.subtotal, 100, "subtotal deve ser 100");
  assert.equal(result.discount, 0, "desconto deve ser 0 sem cupom");
  assert.equal(result.tax, 10, "tax deve ser 10% de 100 = 10");
  assert.equal(result.total, 110, "total deve ser subtotal + tax = 110");
});

test("calculateTotal — com cupom percent desconta antes de calcular tax", async () => {
  // Arrange
  const { calculateTotal } = await loadPricing();
  const items = [{ price: 100, quantity: 1 }];
  const coupon = { type: "percent", discount: 10 };

  // Act
  const result = calculateTotal({ items, coupon });

  // Assert
  assert.equal(result.subtotal, 100, "subtotal deve ser 100");
  assert.equal(result.discount, 10, "desconto deve ser 10% de 100 = 10");
  assert.equal(result.tax, 9, "tax deve ser 10% de (100-10) = 9");
  assert.equal(result.total, 99, "total = 100 - 10 + 9 = 99");
});

test("calculateTotal — com cupom fixed desconta antes de calcular tax", async () => {
  // Arrange
  const { calculateTotal } = await loadPricing();
  const items = [{ price: 200, quantity: 1 }];
  const coupon = { type: "fixed", discount: 50 };

  // Act
  const result = calculateTotal({ items, coupon });

  // Assert
  assert.equal(result.subtotal, 200, "subtotal deve ser 200");
  assert.equal(result.discount, 50, "desconto fixo deve ser 50");
  assert.equal(result.tax, 15, "tax deve ser 10% de (200-50) = 15");
  assert.equal(result.total, 165, "total = 200 - 50 + 15 = 165");
});

// -------------------------------------------------------------------------
// isCouponValid
// -------------------------------------------------------------------------

test("isCouponValid — sem cupom retorna false [branch: !coupon]", async () => {
  // Arrange
  const { isCouponValid } = await loadPricing();

  // Act
  const result = isCouponValid(null);

  // Assert
  assert.equal(result, false, "isCouponValid(null) deve retornar false");
});

test("isCouponValid — cupom com data futura retorna true [branch: date > now]", async () => {
  // Arrange
  const { isCouponValid } = await loadPricing();
  const coupon = { code: "PROMO10", discount: 10, type: "percent", expiresAt: "2099-12-31" };

  // Act
  const result = isCouponValid(coupon);

  // Assert
  assert.equal(result, true, "cupom com expiresAt no futuro deve ser válido");
});

test("isCouponValid — cupom expirado retorna false [branch: date <= now]", async () => {
  // Arrange
  const { isCouponValid } = await loadPricing();
  const coupon = { code: "EXPIRED", discount: 5, type: "percent", expiresAt: "2024-01-01" };

  // Act
  const result = isCouponValid(coupon);

  // Assert
  assert.equal(result, false, "cupom com expiresAt no passado deve ser inválido");
});
