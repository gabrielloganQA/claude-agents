#!/usr/bin/env node
// Watcher local para desenvolvimento ativo.
//
// 1. Reroda testes API quando algo muda em sample-app/ ou tests/
// 2. Detecta SÍMBOLOS NOVOS (export function/const) em arquivos salvos
//    e avisa se não tem teste com nome correspondente — sugere /qa-pre-pr.
//
// Uso: npm run watch
//
// Sem deps extras — usa node:fs.watch + regex simples.

const { watch, readFileSync, existsSync } = require("node:fs");
const { spawn } = require("node:child_process");
const path = require("node:path");
const { execSync } = require("node:child_process");

const ROOT = process.cwd();
const APP_DIR = path.join(ROOT, "sample-app");
const TEST_DIR = path.join(ROOT, "tests");

let running = null;
let pending = false;
let lastTrigger = 0;
const seenSymbols = new Set(); // pra não avisar 2x no mesmo símbolo

function runSuite(reason) {
  const now = Date.now();
  if (now - lastTrigger < 500) return;
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

// === SHIFT-LEFT: detector de símbolos novos sem teste ===

function extractSymbols(filePath) {
  // Retorna os nomes de funções/components/const exportados.
  if (!existsSync(filePath)) return [];
  let content;
  try { content = readFileSync(filePath, "utf8"); }
  catch { return []; }
  const syms = [];
  // export function NAME / export async function NAME / export default function NAME
  const fnRe = /export\s+(?:default\s+)?(?:async\s+)?function\s+(\w+)/g;
  let m;
  while ((m = fnRe.exec(content))) syms.push(m[1]);
  // export const NAME = function / arrow / etc.
  const constRe = /export\s+const\s+(\w+)\s*=/g;
  while ((m = constRe.exec(content))) syms.push(m[1]);
  return syms;
}

function hasTestFor(symbol) {
  // grep silencioso em tests/ pelo nome do símbolo
  try {
    execSync(`grep -rIq -- "${symbol}" tests/ 2>/dev/null`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function checkShiftLeft(filePath, label) {
  // só pra arquivos de produção (não testes)
  if (filePath.includes("/test") || filePath.includes(".test.") || filePath.includes(".spec.")) return;
  const syms = extractSymbols(filePath);
  const newOnes = syms.filter((s) => !seenSymbols.has(filePath + ":" + s));
  if (newOnes.length === 0) return;
  newOnes.forEach((s) => seenSymbols.add(filePath + ":" + s));

  const uncovered = newOnes.filter((s) => !hasTestFor(s));
  if (uncovered.length === 0) return;

  console.log(
    `\n\x1b[33m[watch] 📝 ${uncovered.length} símbolo(s) novo(s) sem teste em ${path.relative(ROOT, filePath)}:\x1b[0m`,
  );
  uncovered.forEach((s) => console.log(`  - ${s}()`));
  console.log(
    `\x1b[33m[watch]    sugestão: rode \`/qa-pre-pr\` ou \`/pre-pr-check\` no Claude Code\x1b[0m`,
  );
}

// === watchers ===

function setupWatcher(dir, label) {
  try {
    watch(dir, { recursive: true }, (_event, filename) => {
      if (!filename) return;
      if (filename.includes("node_modules") || filename.includes(".next")) return;
      if (!/\.(js|jsx|ts|tsx|mjs)$/.test(filename)) return;

      const fullPath = path.join(dir, filename);

      // shift-left check em arquivos de produção
      if (label === "sample-app") {
        checkShiftLeft(fullPath, label);
      }

      runSuite(`${label}: ${filename}`);
    });
    console.log(`\x1b[90m[watch] observando ${label} (${dir})\x1b[0m`);
  } catch (e) {
    console.warn(`[watch] não foi possível observar ${dir}: ${e.message}`);
  }
}

console.log("\x1b[1m[watch] iniciado. Ctrl-C para sair.\x1b[0m");
console.log("[watch] requer o dev server rodando em outra aba (npm run dev).");
console.log("[watch] shift-left: avisa quando você salva código novo sem teste.");
setupWatcher(APP_DIR, "sample-app");
setupWatcher(TEST_DIR, "tests");
runSuite("varredura inicial");

process.on("SIGINT", () => {
  console.log("\n[watch] saindo.");
  if (running) running.kill();
  process.exit(0);
});
