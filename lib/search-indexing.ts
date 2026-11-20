import type { Metadata } from "next";

/**
 * Renders `<meta name="robots" content="noindex">`. For pages that gain nothing
 * from search results, above all those whose URL carries a secret Token.
 */
export const noIndex = { robots: { index: false } } satisfies Metadata;
