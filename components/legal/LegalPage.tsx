import Link from "next/link";
import type { ReactNode } from "react";
import { PublicPageShell } from "@/components/PublicPageShell";

type LegalPageProps = {
  title: string;
  /** When the text last changed, e.g. "14 november 2026". Changes are announced nowhere else. */
  lastUpdated: string;
  children: ReactNode;
};

/** The public, readable-by-anyone frame shared by the Privacy policy and the Terms of use. */
export function LegalPage({ title, lastUpdated, children }: LegalPageProps) {
  return (
    <PublicPageShell className="max-w-2xl px-4 py-12 md:px-6">
      <Link href="/" className="text-sm text-muted-foreground hover:underline">
        Sjung
      </Link>
      <h1 className="mt-6 text-3xl font-semibold">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">Senast uppdaterad {lastUpdated}</p>
      <div className="mt-8 space-y-4 leading-relaxed [&_a]:underline [&_h2]:pt-4 [&_h2]:text-xl [&_h2]:font-semibold [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-6">
        {children}
      </div>
    </PublicPageShell>
  );
}
