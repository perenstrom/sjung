import Link from "next/link";

import { CreditRoleBadge } from "@/components/pieces/CreditRoleBadge";
import type { CreditedPiece } from "@/lib/pieces/credits";
import { pieceHref } from "@/lib/pieces/href";

/**
 * The Pieces a Person is credited on, one row per Piece: its name as a link
 * to the Piece, then a badge per Credit role the Person holds on it. A row
 * that doesn't fit wraps its badges under the name.
 */
export function PersonPiecesList({
  groupSlug,
  pieces,
}: {
  groupSlug: string;
  /** In display order, as `groupCreditsByPiece` returns them. */
  pieces: CreditedPiece[];
}) {
  if (pieces.length === 0) {
    return <p className="text-sm text-muted-foreground">Inga noter med den här personen ännu.</p>;
  }

  return (
    <ul className="divide-y border-y text-sm">
      {pieces.map((piece) => (
        <li
          key={piece.pieceId}
          className="flex min-h-11 flex-wrap items-center gap-x-2 gap-y-1 py-2.5"
        >
          <Link className="min-w-0 font-medium break-words underline" href={pieceHref(groupSlug, piece.pieceId)}>
            {piece.name}
          </Link>
          {piece.roles.map((role) => (
            <CreditRoleBadge key={role} role={role} />
          ))}
        </li>
      ))}
    </ul>
  );
}
