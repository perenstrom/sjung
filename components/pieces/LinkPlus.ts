import { createLucideIcon } from "lucide-react";

/**
 * Lucide's `link` with a plus in its empty top-left corner. Lucide has
 * `file-plus` but no `link-plus`; this pairs with it on the add buttons.
 */
export const LinkPlus = createLucideIcon("link-plus", [
  ["path", { d: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71", key: "link-1" }],
  ["path", { d: "M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71", key: "link-2" }],
  ["path", { d: "M5 2v6", key: "plus-1" }],
  ["path", { d: "M2 5h6", key: "plus-2" }],
]);
