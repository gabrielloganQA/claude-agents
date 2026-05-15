#!/usr/bin/env node
// Watcher local para desenvolvimento ativo.
// Observa mudanças em sample-app/ e tests/, reroda os testes afetados.
//
// Uso: npm run watch
//
// Implementação minimalista usando node:fs.watch para evitar deps extras.

const { watch } = require("node:fs");
const { spawn } = require("node:child_process");
const path = require("node:path");

const ROOT = process.cwd();
const APP_DIR = path.join(ROOT, "sample-app");
const TEST_DIR = path.join(ROOT, "tests");

let running = null;
let pending = false;
let lastTrigger = 0;

function runSuite(reason) {
  const now = Date.now();
  if (now - lastTrigger < 500) return; // debounce duro
  lastTrigger = now;

  if (running) {
    pending = true;
    return;
  }

  console.log(`\n\x1b[36m[watch] ${reason} — rodando suite de API...\x1b[0m`);
  running = spawn("npm", ["run", "test:api"], { stdio: "inherit", shell: true });
  running.on("exit", (code) => {
    running = null;
    if (code === 0) {
      console.log("\x1b[32m[watch] ✓ API verde. Aguardando próxima mudança...\x1b[0m");
    } else {
      console.log("\x1b[31m[watch] ✗ Falhas detectadas. Corrija e salve para retentar.\x1b[0m");
    }
    if (pending) {
      pending = false;
      runSuite("mudança durante execução");
    }
  });
}

function setupWatcher(dir, label) {
  try {
    watch(dir, { recursive: true }, (_event, filename) => {
      if (!filename) return;
      if (filename.includes("node_modules") || filename.includes(".next")) return;
      if (!/\.(js|jsx|ts|tsx|mjs)$/.test(filename)) return;
      runSuite(`${label}: ${filename}`);
    });
    console.log(`\x1b[90m[watch] observando ${label} (${dir})\x1b[0m`);
  } catch (e) {
    console.warn(`[watch] não foi possível observar ${dir}: ${e.message}`);
  }
}

console.log("\x1b[1m[watch] iniciado. Ctrl-C para sair.\x1b[0m");
console.log("[watch] requer o dev server rodando em outra aba (npm run dev).");
setupWatcher(APP_DIR, "sample-app");
setupWatcher(TEST_DIR, "tests");
runSuite("varredura inicial");

process.on("SIGINT", () => {
  console.log("\n[watch] saindo.");
  if (running) running.kill();
  process.exit(0);
});
