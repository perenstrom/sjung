import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

/** @type {import("eslint").Linter.Config[]} */
const eslintConfig = [
  ...coreWebVitals,
  ...typescript,
  // Copied from node_modules by scripts/copy-player-assets.mjs.
  { ignores: ["public/vendor/"] },
];

export default eslintConfig;
