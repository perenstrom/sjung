/** @type {import("prettier").Config} */
const config = {
  printWidth: 120,
  // Keep hand-written line breaks in Markdown prose.
  proseWrap: "preserve",
  plugins: ["prettier-plugin-tailwindcss"],
  // Tailwind v4 has no JS config: the plugin reads the theme from the CSS entry.
  tailwindStylesheet: "./app/globals.css",
};

export default config;
