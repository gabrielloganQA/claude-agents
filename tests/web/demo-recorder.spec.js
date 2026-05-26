/**
 * Demo recorder — roda o fluxo principal da app gravando video.
 *
 * Não é um "teste" no sentido tradicional: não tem assertions caras.
 * Existe pra ser executado pelo workflow demo-gif.yml em merges,
 * produzindo um screencast da feature em uso.
 *
 * Configuração de video é override-ada via env var DEMO_RECORD=1 — o
 * playwright.config.js default não grava video sempre (só on failure).
 */

const { test, expect } = require("@playwright/test");

// Só roda quando DEMO_RECORD=1 está setado (no workflow demo-gif.yml).
const SHOULD_RUN = process.env.DEMO_RECORD === "1";

test.describe("Demo recorder", () => {
  test.skip(!SHOULD_RUN, "Demo recorder roda só com DEMO_RECORD=1");

  test.use({
    video: { mode: "on", size: { width: 800, height: 600 } },
    viewport: { width: 800, height: 600 },
  });

  test("fluxo completo: criar, marcar, remover TODO", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "TODO App" })).toBeVisible();
    await page.waitForTimeout(700);

    // Adiciona dois TODOs
    const input = page.getByLabel("Novo TODO");
    await input.fill("Comprar pão");
    await page.waitForTimeout(300);
    await page.getByRole("button", { name: "Adicionar" }).click();
    await page.waitForTimeout(500);

    await input.fill("Estudar Claude Code");
    await page.waitForTimeout(300);
    await page.getByRole("button", { name: "Adicionar" }).click();
    await page.waitForTimeout(800);

    // Marca primeiro como concluído
    const first = page.getByTestId("todo-item").filter({ hasText: "Comprar pão" });
    await first.getByRole("checkbox").check();
    await page.waitForTimeout(900);

    // Remove segundo
    const second = page.getByTestId("todo-item").filter({ hasText: "Estudar" });
    await second.getByRole("button", { name: /Remover/ }).click();
    await page.waitForTimeout(900);
  });
});
