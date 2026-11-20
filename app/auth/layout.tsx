import type { Metadata } from "next";
import { noIndex } from "@/lib/search-indexing";

// Every page under /auth stays out of search results, including the ones whose
// URL carries a token (password reset, email confirmation) and any added later.
export const metadata: Metadata = noIndex;

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}
