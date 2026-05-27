/**
 * Técnica: Statement/Branch/Function Coverage (A.1) + Decision Table (B.3)
 * Referência: docs/TESTING-METHODOLOGIES.md seção A.1
 * Área: sample-app/app/api/coupons/route.js
 *
 * Cobre os branches de GET /api/coupons:
 *   - sem ?code → lista todos os cupons
 *   - ?code inexistente → 404 [branch: !c]
 *   - ?code existente válido → retorna cupom + valid=true
 *   - ?code existente expirado → retorna cupom + valid=false
 *
 * Isolamento: cada teste chama POST /api/testkit/reset.
 */

"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");

const BASE = process.env.API_BASE || "http://localhost:3000";

async function reset() {
  await fetch(`${BASE}/api/testkit/reset`, { method: "POST" });
}

async function api(method, path) {
  const r = await fetch(`${BASE}${path}`, { method });
  let data = null;
  try {
    data = await r.json();
  } catch {}
  return { status: r.status, data };
}

// ---------------------------------------------------------------------------
// GET /api/coupons — sem parâmetro (lista todos)
// ---------------------------------------------------------------------------

test("GET /api/coupons sem ?code retorna lista de todos os cupons [branch: !code]", async () => {
  // Arrange
  await reset();

  // Act
  const r = await api("GET", "/api/coupons");

  // Assert
  assert.equal(r.status, 200, "GET /api/coupons deve retornar 200");
  assert.ok(Array.isArray(r.data.coupons), "resposta deve ter campo coupons (array)");
  assert.ok(r.data.coupons.length >= 3, "deve haver pelo menos 3 cupons (PROMO10, BLACK50, EXPIRED)");
});

// ---------------------------------------------------------------------------
// GET /api/coupons?code=INEXISTENTE → 404
// ---------------------------------------------------------------------------

test("GET /api/coupons?code= cupom inexistente retorna 404 [branch: !c]", async () => {
  // Arrange
  await reset();

  // Act
  const r = await api("GET", "/api/coupons?code=CUPOM-FAKE-99");

  // Assert
  assert.equal(r.status, 404, "cupom inexistente deve retornar 404");
  assert.ok(r.data.error, "resposta de 404 deve ter campo error");
});

// ---------------------------------------------------------------------------
// GET /api/coupons?code=PROMO10 — cupom válido
// ---------------------------------------------------------------------------

test("GET /api/coupons?code=PROMO10 retorna cupom com valid=true [branch: isCouponValid=true]", async () => {
  // Arrange
  await reset();

  // Act
  const r = await api("GET", "/api/coupons?code=PROMO10");

  // Assert
  assert.equal(r.status, 200, "cupom existente deve retornar 200");
  assert.ok(r.data.coupon, "resposta deve ter campo coupon");
  assert.equal(r.data.coupon.code, "PROMO10", "code deve bater");
  assert.equal(r.data.valid, true, "PROMO10 ainda não expirou — valid deve ser true");
});

// ---------------------------------------------------------------------------
// GET /api/coupons?code=EXPIRED — cupom expirado
// ---------------------------------------------------------------------------

test("GET /api/coupons?code=EXPIRED retorna cupom com valid=false [branch: isCouponValid=false]", async () => {
  // Arrange
  await reset();

  // Act
  const r = await api("GET", "/api/coupons?code=EXPIRED");

  // Assert
  assert.equal(r.status, 200, "cupom expirado deve retornar 200 (cupom existe, mas está inválido)");
  assert.equal(r.data.coupon.code, "EXPIRED", "code deve bater");
  assert.equal(
    r.data.valid,
    false,
    "EXPIRED expirou em 2024-01-01 — valid deve ser false"
  );
});
