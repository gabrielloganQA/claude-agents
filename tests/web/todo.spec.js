const { test, expect } = require("@playwright/test");

test.describe("TODO app — fluxos principais", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "TODO App" })).toBeVisible();
  });

  test("adiciona um TODO", async ({ page }) => {
    const input = page.getByLabel("Novo TODO");
    await input.fill("Comprar pão");
    await page.getByRole("button", { name: "Adicionar" }).click();
    await expect(page.getByTestId("todo-item").filter({ hasText: "Comprar pão" })).toBeVisible();
  });

  test("marca como concluído e depois desmarca", async ({ page }) => {
    const input = page.getByLabel("Novo TODO");
    await input.fill("Estudar Claude Code");
    await page.getByRole("button", { name: "Adicionar" }).click();

    const item = page.getByTestId("todo-item").filter({ hasText: "Estudar Claude Code" });
    const checkbox = item.getByRole("checkbox");

    await checkbox.check();
    await expect(checkbox).toBeChecked();

    // Aqui o BUG #2 vai aparecer: clicar de novo deveria desmarcar, mas o backend
    // sempre força done=true.
    await checkbox.uncheck();
    await expect(checkbox).not.toBeChecked();
  });

  test("remove um TODO", async ({ page }) => {
    const input = page.getByLabel("Novo TODO");
    await input.fill("Item para remover");
    await page.getByRole("button", { name: "Adicionar" }).click();

    const item = page.getByTestId("todo-item").filter({ hasText: "Item para remover" });
    await item.getByRole("button", { name: /Remover/ }).click();
    await expect(item).toHaveCount(0);
  });
});
