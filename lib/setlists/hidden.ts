import type { Prisma } from "@/app/generated/prisma/client";

/** Selects what is Hidden on a Set list piece, for {@link hiddenIdsOf}. */
export const HIDDEN_SELECT = {
  hiddenFiles: { select: { fileId: true }, orderBy: { fileId: "asc" } },
  hiddenLinks: { select: { linkId: true }, orderBy: { linkId: "asc" } },
} as const satisfies Prisma.SetListPieceSelect;

/** The ids of the Files and Links Hidden on a Set list piece, from {@link HIDDEN_SELECT}. */
export function hiddenIdsOf(row: { hiddenFiles: { fileId: string }[]; hiddenLinks: { linkId: string }[] }): {
  hiddenFileIds: string[];
  hiddenLinkIds: string[];
} {
  return {
    hiddenFileIds: row.hiddenFiles.map(({ fileId }) => fileId),
    hiddenLinkIds: row.hiddenLinks.map(({ linkId }) => linkId),
  };
}

/** What is Hidden on one Set list piece, as a view of its Files and Links needs it. */
export type SetListPieceHides = {
  id: string;
  hiddenFileIds: readonly string[];
  hiddenLinkIds: readonly string[];
  /** The Set list's name where the view names it (a Piece's page), else it says just "repertoaren". */
  setListName?: string;
};

/**
 * A row of a pieces list as the Set list piece it is, with what it hides: a
 * Set list's rows are its `SetListPieceStep`s. `undefined` for a row that
 * isn't one, outside a Set list.
 */
export function setListPieceOf(row: {
  id: string;
  hiddenFileIds?: readonly string[];
  hiddenLinkIds?: readonly string[];
}): SetListPieceHides | undefined {
  const { id, hiddenFileIds, hiddenLinkIds } = row;
  return hiddenFileIds && hiddenLinkIds ? { id, hiddenFileIds, hiddenLinkIds } : undefined;
}

type Identified = { id: string };

/**
 * A Set list piece's Files and Links as they show: Hidden ones left out, or
 * with `showHidden` kept and marked `hidden` (Edit mode, or "Visa alla"). Group
 * Categories from the result, so they follow what shows. `hiddenCount` is how
 * many of them are Hidden. Without `hides` nothing is Hidden.
 */
export function applyHidden<F extends Identified, L extends Identified>(
  files: readonly F[],
  links: readonly L[],
  hides: Pick<SetListPieceHides, "hiddenFileIds" | "hiddenLinkIds"> | undefined,
  { showHidden }: { showHidden: boolean },
): { files: (F & { hidden: boolean })[]; links: (L & { hidden: boolean })[]; hiddenCount: number } {
  const hiddenFiles = new Set(hides?.hiddenFileIds);
  const hiddenLinks = new Set(hides?.hiddenLinkIds);
  const marked = {
    files: files.map((file) => ({ ...file, hidden: hiddenFiles.has(file.id) })),
    links: links.map((link) => ({ ...link, hidden: hiddenLinks.has(link.id) })),
  };
  const hiddenCount = [...marked.files, ...marked.links].filter((item) => item.hidden).length;
  if (showHidden) return { ...marked, hiddenCount };
  return {
    files: marked.files.filter((file) => !file.hidden),
    links: marked.links.filter((link) => !link.hidden),
    hiddenCount,
  };
}

/** Where a File or Link is Hidden, as the hide action says it: `i "Julkonsert 2026"`, or `i repertoaren`. */
export function hiddenPlace(setListName: string | undefined): string {
  return setListName === undefined ? "i repertoaren" : `i "${setListName}"`;
}

/** The notice on a Piece's page opened from a Set list piece that hides some of its Files and Links. */
export function hiddenNotice(count: number, setListName: string): string {
  const what = count === 1 ? "En fil eller länk är dold" : `${count} filer och länkar är dolda`;
  return `${what} ${hiddenPlace(setListName)}.`;
}
