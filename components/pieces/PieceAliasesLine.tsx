import { cn } from "@/lib/utils";

/**
 * A muted "Även kallad …" line listing Aliases in the given order, for under
 * a Piece's name. Renders nothing for no Aliases. A block `span`, so it also
 * fits inside a link, a button or a select option.
 */
export function PieceAliasesLine({
  aliases,
  className,
}: {
  aliases: readonly string[];
  className?: string;
}) {
  if (aliases.length === 0) return null;
  return (
    <span className={cn("text-muted-foreground block text-sm font-normal", className)}>
      Även kallad {aliases.join(", ")}
    </span>
  );
}
