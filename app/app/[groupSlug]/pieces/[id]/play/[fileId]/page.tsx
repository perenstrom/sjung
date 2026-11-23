import { notFound } from "next/navigation";

import { PlayerView } from "@/components/player/PlayerView";
import { getPlayerData } from "@/lib/pieces/player";

type PageProps = {
  params: Promise<{ groupSlug: string; id: string; fileId: string }>;
};

/** The player, open on one of the Piece's Playable Files (`playerHref`). */
export default async function PiecePlayerPage({ params }: PageProps) {
  const { groupSlug, id, fileId } = await params;
  const player = await getPlayerData(groupSlug, id, fileId);
  if (!player) {
    notFound();
  }

  // Keyed by File, so switching File starts the player afresh.
  return <PlayerView key={player.file.id} groupSlug={groupSlug} pieceId={id} {...player} />;
}
