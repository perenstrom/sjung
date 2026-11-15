import { TableCell, TableRow } from "@/components/ui/table";

// A large letter with generous space above and little below, so each group
// reads as a section. Headings, so assistive technology can jump between
// letters and doesn't read a divider as a Piece.
const LETTER_CLASS = "text-xl font-semibold";

/** The letter heading before a group in the pieces table: a full-width row. */
export function LetterDividerTableRow({ letter, colSpan }: { letter: string; colSpan: number }) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={colSpan} className="pt-8 pb-1">
        <h2 className={LETTER_CLASS}>{letter}</h2>
      </TableCell>
    </TableRow>
  );
}

/** The letter heading before a group in the pieces mobile list, padded like its rows. */
export function LetterDividerListItem({ letter }: { letter: string }) {
  return (
    // Presentation, so the list's item count is the Pieces only.
    <li role="presentation" className="px-4 pt-6 pb-1">
      <h2 className={LETTER_CLASS}>{letter}</h2>
    </li>
  );
}
