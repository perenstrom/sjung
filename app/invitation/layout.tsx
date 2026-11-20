import type { Metadata } from "next";
import { noIndex } from "@/lib/search-indexing";

// The invitation URL carries the Invitation's token, so keep it out of search results.
export const metadata: Metadata = noIndex;

export default function InvitationLayout({ children }: { children: React.ReactNode }) {
  return children;
}
