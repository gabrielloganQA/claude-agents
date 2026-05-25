// Flat config (ESLint 9+). Mantém regras mínimas — só pega erros reais,
// não impõe estilo (Prettier cuida disso).
const js = require("@eslint/js");

module.exports = [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      globals: {
        console: "readonly",
        process: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        module: "readonly",
        require: "readonly",
        exports: "readonly",
        global: "readonly",
        globalThis: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        fetch: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
      },
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "no-console": "off",
      "no-empty": ["error", { allowEmptyCatch: true }],
      "prefer-const": "warn",
      "no-var": "error",
      eqeqeq: ["error", "smart"],
    },
  },
  {
    files: ["tests/**/*.js", "**/*.test.js", "**/*.spec.js"],
    languageOptions: {
      globals: {
        test: "readonly",
        expect: "readonly",
        describe: "readonly",
        it: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
      },
    },
  },
  {
    ignores: [
      "node_modules/**",
      "sample-app/.next/**",
      "sample-app/node_modules/**",
      ".next/**",
      "out/",
      "dist/",
      "build/",
      "coverage/",
      "coverage-tmp/",
      "playwright-report/",
      "test-results/",
      "perf-reports/",
      "perf-baseline/",
      "mutation-report/",
      ".stryker-tmp/",
    ],
  },
];
