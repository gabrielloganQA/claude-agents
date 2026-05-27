/**
 * Técnica: Statement/Branch/Function Coverage (A.1) + State Transition (B.4)
 * Referência: docs/TESTING-METHODOLOGIES.md seção A.1
 * Área: sample-app/app/lib/flags.js — feature flags em memória
 *
 * Cobre todas as funções:
 *   - getFlag (flag existente com valor true, false e undefined)
 *   - setFlag (altera valor)
 *   - listFlags (retorna cópia de todas as flags)
 *   - resetFlags (restaura defaults)
 *
 * Isolamento: cada teste chama resetFlags() no início (§A.1 TESTING-POLICY).
 */

"use strict";

const { test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const flagsPath = path.resolve(__dirname, "../../sample-app/app/lib/flags.js");

// ESM import — reutiliza o mesmo módulo entre testes (estado global intencional)
let getFlag, setFlag, listFlags, resetFlags;

// Carrega uma única vez e reseta no início de cada teste
async function ensureLoaded() {
  if (!getFlag) {
    const mod = await import(flagsPath);
    getFlag = mod.getFlag;
    setFlag = mod.setFlag;
    listFlags = mod.listFlags;
    resetFlags = mod.resetFlags;
  }
}

// -------------------------------------------------------------------------
// getFlag
// -------------------------------------------------------------------------

test("getFlag — retorna false para flag desabilitada por default ('nova-tela-confirmacao')", async () => {
  // Arrange
  await ensureLoaded();
  resetFlags();

  // Act
  const result = getFlag("nova-tela-confirmacao");

  // Assert
  assert.equal(result, false, "nova-tela-confirmacao deve ser false por default");
});

test("getFlag — retorna true para flag habilitada por default ('upload-xml-habilitado')", async () => {
  // Arrange
  await ensureLoaded();
  resetFlags();

  // Act
  const result = getFlag("upload-xml-habilitado");

  // Assert
  assert.equal(result, true, "upload-xml-habilitado deve ser true por default");
});

test("getFlag — retorna undefined para flag não registrada", async () => {
  // Arrange
  await ensureLoaded();
  resetFlags();

  // Act
  const result = getFlag("flag-que-nao-existe");

  // Assert
  assert.equal(result, undefined, "flag não registrada deve retornar undefined");
});

// -------------------------------------------------------------------------
// setFlag
// -------------------------------------------------------------------------

test("setFlag — altera valor de flag existente de false para true", async () => {
  // Arrange
  await ensureLoaded();
  resetFlags();

  // Act
  setFlag("nova-tela-confirmacao", true);

  // Assert
  assert.equal(
    getFlag("nova-tela-confirmacao"),
    true,
    "setFlag deve alterar o valor da flag"
  );
});

test("setFlag — cria nova flag não registrada nos defaults", async () => {
  // Arrange
  await ensureLoaded();
  resetFlags();

  // Act
  setFlag("flag-nova", "valor-custom");

  // Assert
  assert.equal(
    getFlag("flag-nova"),
    "valor-custom",
    "setFlag deve criar a flag mesmo que não esteja nos defaults"
  );
});

// -------------------------------------------------------------------------
// listFlags
// -------------------------------------------------------------------------

test("listFlags — retorna objeto com todas as flags e seus valores atuais", async () => {
  // Arrange
  await ensureLoaded();
  resetFlags();

  // Act
  const flags = listFlags();

  // Assert
  assert.ok(typeof flags === "object" && flags !== null, "listFlags deve retornar um objeto");
  assert.equal(flags["nova-tela-confirmacao"], false, "nova-tela-confirmacao deve ser false");
  assert.equal(flags["upload-xml-habilitado"], true, "upload-xml-habilitado deve ser true");
});

test("listFlags — retorna cópia (mutação não afeta o estado interno)", async () => {
  // Arrange
  await ensureLoaded();
  resetFlags();

  // Act
  const flags = listFlags();
  flags["nova-tela-confirmacao"] = true; // muta a cópia

  // Assert
  assert.equal(
    getFlag("nova-tela-confirmacao"),
    false,
    "mutação da cópia retornada por listFlags não deve afetar o estado interno"
  );
});

// -------------------------------------------------------------------------
// resetFlags
// -------------------------------------------------------------------------

test("resetFlags — restaura todos os defaults após alterações", async () => {
  // Arrange
  await ensureLoaded();
  setFlag("nova-tela-confirmacao", true);
  setFlag("upload-xml-habilitado", false);
  setFlag("flag-extra", 99);

  // Act
  resetFlags();

  // Assert
  assert.equal(
    getFlag("nova-tela-confirmacao"),
    false,
    "nova-tela-confirmacao deve voltar para false após reset"
  );
  assert.equal(
    getFlag("upload-xml-habilitado"),
    true,
    "upload-xml-habilitado deve voltar para true após reset"
  );
  assert.equal(
    getFlag("flag-extra"),
    undefined,
    "flag criada manualmente deve sumir após reset"
  );
});
