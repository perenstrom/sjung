import { playableFormatOf, type PlayableFormat } from "@/lib/file-formats";
import { findGroupAccess } from "@/lib/group-access";
import { inCategoryOrder } from "@/lib/pieces/categories";
import * as fileStore from "@/lib/pieces/file-store";
import prisma from "@/lib/prisma";

/** A Playable File the player can switch to. */
export type PlayerFileOption = { id: string; displayName: string; formatLabel: string };

/** What the player needs to open one of a Piece's Playable Files. */
export type PlayerData = {
  pieceName: string;
  file: { id: string; displayName: string; format: PlayableFormat; src: string };
  /** The Piece's Playable Files, this one included, in the order the Piece lists them. */
  files: PlayerFileOption[];
};

/**
 * The player for one of a Piece's Playable Files (see CONTEXT.md), or `null`
 * when the File isn't one, isn't on that Piece, or the User can't see the
 * Group. Any Member may play: playing changes nothing, so it needs no Claim.
 */
export async function getPlayerData(groupSlug: string, pieceId: string, fileId: string): Promise<PlayerData | null> {
  const access = await findGroupAccess(groupSlug);
  if (!access) return null;

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

  const playable = piece.files.flatMap((file) => {
    const format = playableFormatOf(file);
    return format ? [{ ...file, format }] : [];
  });
  const file = playable.find((candidate) => candidate.id === fileId);
  if (!file) return null;

  return {
    pieceName: piece.name,
    file: { id: file.id, displayName: file.displayName, format: file.format, src: await fileStore.signPlayback(file) },
    files: inCategoryOrder(playable).map(({ id, displayName, format }) => ({ id, displayName, formatLabel: format.label })),
  };
}
