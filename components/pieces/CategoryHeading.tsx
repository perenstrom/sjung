import type { ReactNode } from "react";

/**
 * The small muted heading over one Category's Files and Links, the same on
 * the Piece page and in the pieces list. `as` picks the element: a real
 * subheading on the Piece page, plain text in a table cell.
 */
export function CategoryHeading({ as: Tag = "p", children }: { as?: "h3" | "p"; children: ReactNode }) {
  return <Tag className="text-xs font-medium text-muted-foreground">{children}</Tag>;
}
