/**
 * Técnica: Acessibilidade — WCAG 2.1 AA (B.10 em docs/TESTING-METHODOLOGIES.md)
 * Área alvo: cada rota da aplicação
 * Hipótese: Toda rota deve passar nas regras WCAG 2.1 A + AA do axe-core.
 *           Violações `critical` ou `serious` fazem o teste falhar.
 * Risco: a11y não verificada → litígio (LGPD/ADA/EU AA), exclusão de
 *        usuários com deficiência, problemas de SEO.
 */

const { test, expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;

const ROUTES = [
  "/",
  // Adicionar conforme app cresce: "/login", "/dashboard", etc.
];

for (const route of ROUTES) {
  test(`a11y: ${route} sem violações WCAG 2.1 AA críticas/sérias`, async ({ page }) => {
    await page.goto(route);

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    // Log violações pra fácil leitura no CI
    if (results.violations.length > 0) {
      console.log(`\nA11y violations em ${route}:`);
      results.violations.forEach((v) => {
        console.log(`  [${v.impact}] ${v.id}: ${v.help}`);
        console.log(`    → ${v.helpUrl}`);
        v.nodes.forEach((n) => {
          console.log(`    target: ${n.target.join(", ")}`);
        });
      });
    }

    // Falha só em critical ou serious. Moderate/minor ficam como warning no relatório.
    const blocking = results.violations.filter((v) =>
      ["critical", "serious"].includes(v.impact),
    );
    expect(
      blocking,
      `${blocking.length} violações críticas/sérias em ${route}`,
    ).toEqual([]);
  });
}
