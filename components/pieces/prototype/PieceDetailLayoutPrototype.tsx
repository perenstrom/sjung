"use client";

// PROTOTYPE (PER-433), throwaway. Three card-free layouts for the Piece detail
// page, switchable via `?variant=A|B|C` on the existing route. Only the outer
// chrome of the five sections changes; their contents are the real components.

import { createContext, useContext, type ReactNode } from "react";

import { cn } from "@/lib/utils";

export const PIECE_DETAIL_VARIANTS = [
  { key: "A", name: "Headed sections with dividers" },
  { key: "B", name: "Title gutter" },
  { key: "C", name: "Two-column, compact" },
] as const;

export type PieceDetailVariant = (typeof PIECE_DETAIL_VARIANTS)[number]["key"];

export function parsePieceDetailVariant(
  value: string | string[] | undefined,
): PieceDetailVariant {
  const raw = Array.isArray(value) ? value[0] : value;
  return (
    PIECE_DETAIL_VARIANTS.find((v) => v.key === raw?.toUpperCase())?.key ?? "A"
  );
}

const VariantContext = createContext<PieceDetailVariant>("A");

/** Wraps the five sections; picks the page-level layout for the variant. */
export function PieceDetailSectionsLayout({
  variant,
  children,
}: {
  variant: PieceDetailVariant;
  children: ReactNode;
}) {
  return (
    <VariantContext.Provider value={variant}>
      <div
        className={cn(
          // A: one column, hairline between sections.
          variant === "A" && "divide-y border-t",
          // B: one column, each section a row with the title in a left gutter.
          variant === "B" && "divide-y border-y",
          // C: two columns on desktop, reading order left-to-right, top-to-bottom.
          variant === "C" && "grid gap-x-10 gap-y-8 md:grid-cols-2",
        )}
      >
        {children}
      </div>
    </VariantContext.Provider>
  );
}

/** The outer chrome of one Piece detail section, in the active variant's style. */
export function PieceDetailSection({
  title,
  wide = false,
  children,
}: {
  title: string;
  /** C only: span both columns (used for Piece notes, which holds long text). */
  wide?: boolean;
  children: ReactNode;
}) {
  const variant = useContext(VariantContext);

  if (variant === "B") {
    return (
      <section className="grid gap-3 py-5 md:grid-cols-[10rem_1fr] md:gap-8 md:py-6">
        <h2 className="text-base leading-8 font-medium text-muted-foreground md:text-sm md:leading-8">
          {title}
        </h2>
        <div className="min-w-0 space-y-3">{children}</div>
      </section>
    );
  }

  if (variant === "C") {
    return (
      <section className={cn("min-w-0 space-y-3", wide && "md:col-span-2")}>
        <h2 className="border-b pb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {title}
        </h2>
        <div className="space-y-3">{children}</div>
      </section>
    );
  }

  return (
    <section className="space-y-3 py-5 md:py-6">
      <h2 className="text-lg leading-8 font-medium">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
