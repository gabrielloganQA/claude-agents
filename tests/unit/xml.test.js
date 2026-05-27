/**
 * Técnica: Statement/Branch/Function Coverage (A.1) + Equivalence Partitioning (B.1)
 * Referência: docs/TESTING-METHODOLOGIES.md seção A.1
 * Área: sample-app/app/lib/xml.js — parsing de XML de pedidos
 *
 * Cobre todos os branches de parseOrderXml:
 *   - items como array (múltiplos <item>)
 *   - items como objeto único (único <item>) [branch: !Array.isArray + itemsRaw truthy]
 *   - items ausentes [branch: !itemsRaw]
 *   - customer presente e ausente
 *   - coupon presente e ausente
 *
 * Nota: os XMLs são gerados programaticamente (§D.9 da TESTING-POLICY).
 */

"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const xmlPath = path.resolve(__dirname, "../../sample-app/app/lib/xml.js");

async function loadXml() {
  return await import(xmlPath);
}

// -------------------------------------------------------------------------
// parseOrderXml — múltiplos itens (array)
// -------------------------------------------------------------------------

test("parseOrderXml — múltiplos <item> resultam em array de items [branch: Array.isArray]", async () => {
  // Arrange
  const { parseOrderXml } = await loadXml();
  const xml = `<?xml version="1.0"?>
<order>
  <customer><email>alice@example.test</email></customer>
  <items>
    <item><sku>SKU-001</sku><name>Produto A</name><price>10.00</price><quantity>2</quantity></item>
    <item><sku>SKU-002</sku><name>Produto B</name><price>25.50</price><quantity>1</quantity></item>
  </items>
</order>`;

  // Act
  const result = parseOrderXml(xml);

  // Assert
  assert.equal(result.items.length, 2, "dois <item> devem resultar em array com 2 elementos");
  assert.equal(result.items[0].sku, "SKU-001", "primeiro item deve ter sku correto");
  assert.equal(result.items[0].price, 10, "price deve ser convertido para Number");
  assert.equal(result.items[0].quantity, 2, "quantity deve ser convertido para Number");
  assert.equal(result.items[1].sku, "SKU-002", "segundo item deve ter sku correto");
});

// -------------------------------------------------------------------------
// parseOrderXml — item único (objeto, não array)
// -------------------------------------------------------------------------

test("parseOrderXml — único <item> é normalizado para array [branch: !Array.isArray && itemsRaw truthy]", async () => {
  // Arrange
  const { parseOrderXml } = await loadXml();
  const xml = `<?xml version="1.0"?>
<order>
  <items>
    <item><sku>SKU-UNICO</sku><name>Produto Único</name><price>99.90</price><quantity>3</quantity></item>
  </items>
</order>`;

  // Act
  const result = parseOrderXml(xml);

  // Assert
  assert.equal(result.items.length, 1, "único <item> deve resultar em array com 1 elemento");
  assert.equal(result.items[0].sku, "SKU-UNICO", "sku deve ser preservado");
  assert.equal(result.items[0].price, 99.9, "price deve ser convertido para Number");
  assert.equal(result.items[0].quantity, 3, "quantity deve ser convertido para Number");
});

// -------------------------------------------------------------------------
// parseOrderXml — sem itens
// -------------------------------------------------------------------------

test("parseOrderXml — XML sem <items> retorna array vazio [branch: !itemsRaw]", async () => {
  // Arrange
  const { parseOrderXml } = await loadXml();
  const xml = `<?xml version="1.0"?>
<order>
  <customer><email>bob@example.test</email></customer>
</order>`;

  // Act
  const result = parseOrderXml(xml);

  // Assert
  assert.deepEqual(result.items, [], "sem <items> deve retornar array vazio");
});

// -------------------------------------------------------------------------
// parseOrderXml — customer presente
// -------------------------------------------------------------------------

test("parseOrderXml — customer extraído corretamente quando presente", async () => {
  // Arrange
  const { parseOrderXml } = await loadXml();
  const xml = `<?xml version="1.0"?>
<order>
  <customer><email>carol@example.test</email><name>Carol</name></customer>
  <items>
    <item><sku>A</sku><name>X</name><price>1</price><quantity>1</quantity></item>
  </items>
</order>`;

  // Act
  const result = parseOrderXml(xml);

  // Assert
  assert.ok(result.customer, "customer deve estar presente");
  assert.equal(result.customer.email, "carol@example.test", "email do customer deve ser preservado");
});

// -------------------------------------------------------------------------
// parseOrderXml — customer ausente
// -------------------------------------------------------------------------

test("parseOrderXml — customer é null quando ausente [branch: order.customer falsy]", async () => {
  // Arrange
  const { parseOrderXml } = await loadXml();
  const xml = `<?xml version="1.0"?>
<order>
  <items>
    <item><sku>B</sku><name>Y</name><price>5</price><quantity>2</quantity></item>
  </items>
</order>`;

  // Act
  const result = parseOrderXml(xml);

  // Assert
  assert.equal(result.customer, null, "customer deve ser null quando ausente no XML");
});

// -------------------------------------------------------------------------
// parseOrderXml — cupom presente
// -------------------------------------------------------------------------

test("parseOrderXml — coupon extraído quando presente no XML", async () => {
  // Arrange
  const { parseOrderXml } = await loadXml();
  const xml = `<?xml version="1.0"?>
<order>
  <coupon>PROMO10</coupon>
  <items>
    <item><sku>C</sku><name>Z</name><price>50</price><quantity>1</quantity></item>
  </items>
</order>`;

  // Act
  const result = parseOrderXml(xml);

  // Assert
  assert.equal(result.coupon, "PROMO10", "coupon deve ser extraído do XML");
});

// -------------------------------------------------------------------------
// parseOrderXml — cupom ausente
// -------------------------------------------------------------------------

test("parseOrderXml — coupon é null quando ausente [branch: order.coupon falsy]", async () => {
  // Arrange
  const { parseOrderXml } = await loadXml();
  const xml = `<?xml version="1.0"?>
<order>
  <items>
    <item><sku>D</sku><name>W</name><price>10</price><quantity>1</quantity></item>
  </items>
</order>`;

  // Act
  const result = parseOrderXml(xml);

  // Assert
  assert.equal(result.coupon, null, "coupon deve ser null quando ausente no XML");
});

// -------------------------------------------------------------------------
// parseOrderXml — XML sem raiz <order>
// -------------------------------------------------------------------------

test("parseOrderXml — XML sem elemento <order> retorna estrutura vazia [branch: parsed.order falsy -> {}]", async () => {
  // Arrange
  const { parseOrderXml } = await loadXml();
  // XML com raiz diferente — parsed.order será undefined, acionando o branch || {}
  const xml = `<?xml version="1.0"?>
<envelope>
  <data>qualquer</data>
</envelope>`;

  // Act
  const result = parseOrderXml(xml);

  // Assert
  assert.equal(result.customer, null, "customer deve ser null quando <order> está ausente");
  assert.deepEqual(result.items, [], "items deve ser array vazio quando <order> está ausente");
  assert.equal(result.coupon, null, "coupon deve ser null quando <order> está ausente");
});
