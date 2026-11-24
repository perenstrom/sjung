import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

/** @type {import("eslint").Linter.Config[]} */
const eslintConfig = [
  ...coreWebVitals,
  ...typescript,
  // Copied from node_modules by scripts/copy-player-assets.mjs.
  { ignores: ["public/vendor/"] },
  // Last, so it turns off every rule that would clash with Prettier.
  prettier,
];

export default eslintConfig;
