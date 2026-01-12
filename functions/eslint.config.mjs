import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default tseslint.config(
  {
    ignores: ["lib/**/*", "node_modules/**/*", "jest.config.js", "eslint.config.mjs", "**/*.test.ts"],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{js,ts}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.node,
        ...globals.es2020,
      },
      sourceType: "module",
    },
    rules: {
      quotes: ["error", "double", { avoidEscape: true, allowTemplateLiterals: true }],
      indent: ["error", 2],
      "max-len": ["error", { code: 120 }],
      "object-curly-spacing": ["error", "always"],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  }
);
