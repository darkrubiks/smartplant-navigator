import js from "@eslint/js";
import globals from "globals";
export default [
  { ignores: ["dist/**", "node_modules/**", ".migration-backup/**"] },
  js.configs.recommended,
  { files: ["assets/**/*.js"], languageOptions: { globals: globals.browser } },
  {
    files: ["scripts/**/*.mjs", "tests/**/*.js", "eslint.config.js"],
    languageOptions: { globals: globals.node },
  },
  {
    rules: {
      "no-unused-vars": ["error", { argsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }],
    },
  },
];
