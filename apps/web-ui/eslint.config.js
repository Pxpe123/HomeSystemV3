import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{js,jsx}"],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: "latest",
        ecmaFeatures: { jsx: true },
        sourceType: "module",
      },
    },
    rules: {
      "no-unused-vars": [
        "error",
        { varsIgnorePattern: "^[A-Z_]", argsIgnorePattern: "^[A-Z_]" },
      ],
    },
  },
  {
    files: ["tests/**/*.js", "tests/**/*.mjs", "scripts/**/*.mjs", "vite.config.js"],
    languageOptions: { globals: globals.node },
  },
  {
    files: ["src/**/*.{js,jsx}"],
    rules: {
      "no-restricted-globals": [
        "error",
        "fetch",
        "XMLHttpRequest",
        "EventSource",
        "WebSocket",
      ],
      "no-restricted-imports": [
        "error",
        {
          paths: [
            "axios",
            "ky",
            "node-fetch",
            "cross-fetch",
            "superagent",
            "@spotify/web-api-ts-sdk",
          ],
        },
      ],
      "no-restricted-properties": [
        "error",
        ...["window", "globalThis", "self"].flatMap((object) =>
          ["fetch", "XMLHttpRequest", "EventSource"].map((property) => ({
            object,
            property,
            message:
              "Use the HomeSystem server transport; external integrations belong on the server.",
          })),
        ),
        {
          object: "navigator",
          property: "sendBeacon",
          message: "Do not send browser data to external services.",
        },
      ],
    },
  },
  {
    files: ["src/**/*.{js,jsx}"],
    ignores: ["src/core/ServerClient.js"],
    rules: {
      "no-restricted-properties": [
        "error",
        ...["window", "globalThis", "self"].flatMap((object) =>
          ["fetch", "XMLHttpRequest", "EventSource", "WebSocket"].map(
            (property) => ({
              object,
              property,
              message: "Use the shared HomeSystem server transport.",
            }),
          ),
        ),
        {
          object: "navigator",
          property: "sendBeacon",
          message: "Do not send browser data to external services.",
        },
      ],
    },
  },
]);
