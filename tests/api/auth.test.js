/**
 * Técnica: Statement/Branch/Function Coverage (A.1) + Decision Table (B.3) + Error Guessing (B.8)
 * Referência: docs/TESTING-METHODOLOGIES.md seção A.1
 * Área: sample-app/app/api/auth/{login,logout,me}/route.js
 *
 * Cobre os seguintes branches:
 *   POST /api/auth/login
 *     - Content-Type incorreto → 415
 *     - usuário novo → cria conta e retorna cookie de sessão
 *     - usuário existente, senha correta → faz login e retorna cookie
 *     - usuário existente, senha errada → 401 [branch: !checkPassword]
 *   POST /api/auth/logout
 *     - com cookie de sessão → deleta sessão e limpa cookie
 *     - sem cookie → retorna ok mesmo sem sessão [branch: !token]
 *   GET /api/auth/me
 *     - sem cookie → user: null [branch: !token]
 *     - com token inválido → user: null [branch: !decoded]
 *     - com token válido → retorna dados do usuário
 *
 * Isolamento: cada teste chama POST /api/testkit/reset (§A.1 TESTING-POLICY).
 * Dados: emails únicos via timestamp + UUID (§D.8).
 * Sem PII real — usando @example.test (§D.2).
 */

"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");

const BASE = process.env.API_BASE || "http://localhost:3000";

async function reset() {
  await fetch(`${BASE}/api/testkit/reset`, { method: "POST" });
}

async function api(method, path, body, extraHeaders = {}) {
  const headers = body !== undefined
    ? { "Content-Type": "application/json", ...extraHeaders }
    : { ...extraHeaders };

  const r = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });

  let data = null;
  try {
    data = await r.json();
  } catch {}

  const setCookie = r.headers.get("set-cookie") || "";
  return { status: r.status, data, setCookie };
}

function uniqueEmail() {
  return `qa-${Date.now()}-${randomUUID().slice(0, 8)}@example.test`;
}

// ---------------------------------------------------------------------------
// POST /api/auth/login — Content-Type incorreto
// ---------------------------------------------------------------------------

test("POST /api/auth/login sem Content-Type retorna 415", async () => {
  // Arrange
  await reset();

  // Act
  const r = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    body: JSON.stringify({ email: uniqueEmail(), password: "123456" }),
  });

  // Assert
  assert.equal(r.status, 415, "POST /api/auth/login sem Content-Type deve retornar 415");
});

// ---------------------------------------------------------------------------
// POST /api/auth/login — usuário novo (auto-registro)
// ---------------------------------------------------------------------------

test("POST /api/auth/login com novo email cria conta e retorna cookie de sessão [branch: !user -> createUser]", async () => {
  // Arrange
  await reset();
  const email = uniqueEmail();

  // Act
  const r = await api("POST", "/api/auth/login", { email, password: "senha123" });

  // Assert
  assert.equal(r.status, 200, "login de novo usuário deve retornar 200");
  assert.ok(r.data.user, "resposta deve ter campo user");
  assert.equal(r.data.user.email, email, "email do user deve bater");
  assert.ok(r.setCookie.includes("session="), "deve setar cookie de sessão");
});

test("POST /api/auth/login com nome explícito usa nome fornecido [branch: name presente]", async () => {
  // Arrange
  await reset();
  const email = uniqueEmail();

  // Act
  const r = await api("POST", "/api/auth/login", {
    email,
    password: "senha123",
    name: "Alice Teste",
  });

  // Assert
  assert.equal(r.status, 200, "login com name deve retornar 200");
  assert.equal(r.data.user.name, "Alice Teste", "nome fornecido deve ser usado");
});

test("POST /api/auth/login sem nome usa parte do email como nome [branch: !name -> email.split]", async () => {
  // Arrange
  await reset();
  const email = `qa-usuario-${Date.now()}@example.test`;

  // Act
  const r = await api("POST", "/api/auth/login", { email, password: "senha123" });

  // Assert
  assert.equal(r.status, 200, "login sem name deve retornar 200");
  assert.equal(
    r.data.user.name,
    email.split("@")[0],
    "nome deve ser a parte local do email quando name não é fornecido"
  );
});

// ---------------------------------------------------------------------------
// POST /api/auth/login — usuário existente, senha correta
// ---------------------------------------------------------------------------

test("POST /api/auth/login com usuário existente e senha correta retorna 200 [branch: user existente, checkPassword=true]", async () => {
  // Arrange
  await reset();
  const email = uniqueEmail();
  const password = "senhaForte456";
  await api("POST", "/api/auth/login", { email, password });

  // Act
  const r = await api("POST", "/api/auth/login", { email, password });

  // Assert
  assert.equal(r.status, 200, "segundo login com mesma senha deve retornar 200");
  assert.equal(r.data.user.email, email, "email deve bater no segundo login");
});

// ---------------------------------------------------------------------------
// POST /api/auth/login — usuário existente, senha errada → 401
// ---------------------------------------------------------------------------

test("POST /api/auth/login com senha errada retorna 401 [branch: !checkPassword]", async () => {
  // Arrange
  await reset();
  const email = uniqueEmail();
  await api("POST", "/api/auth/login", { email, password: "senhaCorreta" });

  // Act
  const r = await api("POST", "/api/auth/login", { email, password: "senhaErrada" });

  // Assert
  assert.equal(r.status, 401, "login com senha errada deve retornar 401");
  assert.ok(r.data.error, "resposta de 401 deve ter campo error");
});

// ---------------------------------------------------------------------------
// POST /api/auth/logout — com sessão ativa
// ---------------------------------------------------------------------------

test("POST /api/auth/logout com cookie de sessão deleta sessão e retorna ok=true", async () => {
  // Arrange
  await reset();
  const email = uniqueEmail();
  const loginRes = await api("POST", "/api/auth/login", { email, password: "abc123" });
  const sessionCookie = loginRes.setCookie.split(";")[0]; // "session=<token>"

  // Act
  const r = await api("POST", "/api/auth/logout", undefined, { Cookie: sessionCookie });

  // Assert
  assert.equal(r.status, 200, "logout deve retornar 200");
  assert.equal(r.data.ok, true, "resposta deve ter ok=true");
});

// ---------------------------------------------------------------------------
// POST /api/auth/logout — sem cookie (branch: !token)
// ---------------------------------------------------------------------------

test("POST /api/auth/logout sem cookie retorna ok=true mesmo sem sessão [branch: !token]", async () => {
  // Arrange
  await reset();

  // Act
  const r = await api("POST", "/api/auth/logout");

  // Assert
  assert.equal(r.status, 200, "logout sem cookie deve retornar 200");
  assert.equal(r.data.ok, true, "resposta deve ter ok=true mesmo sem sessão");
});

// ---------------------------------------------------------------------------
// GET /api/auth/me — sem cookie
// ---------------------------------------------------------------------------

test("GET /api/auth/me sem cookie retorna user: null [branch: !token]", async () => {
  // Arrange
  await reset();

  // Act
  const r = await api("GET", "/api/auth/me");

  // Assert
  assert.equal(r.status, 200, "GET /me sem cookie deve retornar 200");
  assert.equal(r.data.user, null, "user deve ser null quando não há cookie");
});

// ---------------------------------------------------------------------------
// GET /api/auth/me — com token inválido
// ---------------------------------------------------------------------------

test("GET /api/auth/me com token adulterado retorna user: null [branch: !decoded]", async () => {
  // Arrange
  await reset();

  // Act
  const r = await api("GET", "/api/auth/me", undefined, {
    Cookie: "session=tokenFalsoSemPonto",
  });

  // Assert
  assert.equal(r.status, 200, "GET /me com token inválido deve retornar 200");
  assert.equal(r.data.user, null, "user deve ser null para token inválido");
});

// ---------------------------------------------------------------------------
// GET /api/auth/me — com sessão válida
// ---------------------------------------------------------------------------

test("GET /api/auth/me com cookie válido retorna dados do usuário logado", async () => {
  // Arrange
  await reset();
  const email = uniqueEmail();
  const loginRes = await api("POST", "/api/auth/login", { email, password: "abc123" });
  const sessionCookie = loginRes.setCookie.split(";")[0];

  // Act
  const r = await api("GET", "/api/auth/me", undefined, { Cookie: sessionCookie });

  // Assert
  assert.equal(r.status, 200, "GET /me com sessão válida deve retornar 200");
  assert.ok(r.data.user, "user deve estar presente");
  assert.equal(r.data.user.email, email, "email do user retornado deve bater");
});

// ---------------------------------------------------------------------------
// Fluxo completo: login → me → logout → me
// ---------------------------------------------------------------------------

test("fluxo completo login → me → logout → me verifica estado de sessão [branch: !session após logout]", async () => {
  // Arrange
  await reset();
  const email = uniqueEmail();
  const loginRes = await api("POST", "/api/auth/login", { email, password: "senha123" });
  const sessionCookie = loginRes.setCookie.split(";")[0];

  // Act — verifica sessão ativa
  const meAtivo = await api("GET", "/api/auth/me", undefined, { Cookie: sessionCookie });
  assert.equal(meAtivo.data.user.email, email, "sessão deve estar ativa após login");

  // Act — faz logout
  await api("POST", "/api/auth/logout", undefined, { Cookie: sessionCookie });

  // Act — verifica sessão inativa
  const meDepois = await api("GET", "/api/auth/me", undefined, { Cookie: sessionCookie });

  // Assert
  assert.equal(
    meDepois.data.user,
    null,
    "após logout, GET /me com o mesmo cookie deve retornar user: null [branch: !session]"
  );
});
