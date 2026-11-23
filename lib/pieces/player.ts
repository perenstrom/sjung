import { playableFormatOf, type PlayableFormat } from "@/lib/file-formats";
import { findGroupAccess } from "@/lib/group-access";
import { groupSetListPath } from "@/lib/groups/routes";
import { inCategoryOrder } from "@/lib/pieces/categories";
import * as fileStore from "@/lib/pieces/file-store";
import { pieceHref, playerHref } from "@/lib/pieces/href";
import prisma from "@/lib/prisma";

/** A Playable File the player can switch to, opened from the same place. */
export type PlayerFileOption = { id: string; displayName: string; formatLabel: string; href: string };

/** What the player needs to open one of a Piece's Playable Files. */
export type PlayerData = {
  pieceName: string;
  file: { id: string; displayName: string; format: PlayableFormat; src: string };
  /** The Playable Files it was opened among, this one included, in the order they were listed. */
  files: PlayerFileOption[];
  /** Where closing the player goes: the Piece, or the Set list it was opened from. */
  closeHref: string;
};

/**
 * The player for one of a Piece's Playable Files (see CONTEXT.md), or `null`
 * when the File isn't one, isn't on that Piece, or the User can't see the
 * Group. Any Member may play: playing changes nothing, so it needs no Claim.
 *
 * Opened from a Set list piece (`fromSetListPieceId`), it offers the Playable
 * Files shown there and closes to its Set list; `null` when that Set list
 * piece isn't one of this Piece's in the Group.
 */
export async function getPlayerData(
  groupSlug: string,
  pieceId: string,
  fileId: string,
  { fromSetListPieceId }: { fromSetListPieceId?: string } = {}
): Promise<PlayerData | null> {
  const access = await findGroupAccess(groupSlug);
  if (!access) return null;

  let closeHref = pieceHref(groupSlug, pieceId);
  if (fromSetListPieceId) {
    const setListPiece = await prisma.setListPiece.findFirst({
      where: { id: fromSetListPieceId, pieceId, setList: { groupId: access.group.id } },
      select: { setListId: true },
    });
    if (!setListPiece) return null;
    closeHref = groupSetListPath(groupSlug, setListPiece.setListId);
  }

  const piece = await prisma.piece.findFirst({
    where: { id: pieceId, groupId: access.group.id },
    select: {
      name: true,
      files: {
        select: { id: true, displayName: true, fileName: true, category: true, storagePath: true, mimeType: true },
      },
    },
  });
  if (!piece) return null;

  // Every File shows on a Set list piece until Hidden ones exist (PER-137);
  // the player must then leave those out too.
  const playable = piece.files.flatMap((file) => {
    const format = playableFormatOf(file);
    return format ? [{ ...file, format }] : [];
  });
  const file = playable.find((candidate) => candidate.id === fileId);
  if (!file) return null;

  return {
    pieceName: piece.name,
    file: { id: file.id, displayName: file.displayName, format: file.format, src: await fileStore.signPlayback(file) },
    files: inCategoryOrder(playable).map(({ id, displayName, format }) => ({
      id,
      displayName,
      formatLabel: format.label,
      href: playerHref(groupSlug, pieceId, id, { fromSetListPieceId }),
    })),
    closeHref,
  };
}
