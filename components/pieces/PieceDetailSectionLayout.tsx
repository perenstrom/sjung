import type { ReactNode } from "react";

/**
 * One section of the Piece detail page. On desktop the title sits in a narrow
 * muted gutter to the left of the content. Below `md` it is a full-bleed band
 * with the title above the content. Sections are separated by hairlines from
 * `PieceDetailSectionStack`, which needs them to be its direct DOM children.
 */
export function PieceDetailSectionLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-3 max-md:bg-card max-md:p-4 max-md:text-card-foreground md:grid-cols-[10rem_minmax(0,1fr)] md:gap-8 md:py-6">
      <h2 className="text-lg leading-8 font-medium md:text-sm md:leading-6 md:text-muted-foreground">{title}</h2>
      <div className="min-w-0 space-y-3">{children}</div>
    </section>
  );
}

/**
 * Stacks the Piece detail sections with a hairline above, between and below
 * them. Below `md` it runs flush to the screen edges, pulled out of the 16px
 * page gutter (`px-4` on <main> in app/app/layout.tsx).
 */
export function PieceDetailSectionStack({ children }: { children: ReactNode }) {
  return <div className="divide-y border-y max-md:-mx-4">{children}</div>;
}
