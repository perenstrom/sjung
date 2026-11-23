import { notFound } from "next/navigation";

import { PlayerView } from "@/components/player/PlayerView";
import { searchParamId } from "@/lib/pieces/href";
import { getPlayerData } from "@/lib/pieces/player";

type PageProps = {
  params: Promise<{ groupSlug: string; id: string; fileId: string }>;
  searchParams: Promise<{ setlistpiece?: string | string[] }>;
};

/** The player, open on one of the Piece's Playable Files (`playerHref`). */
export default async function PiecePlayerPage({ params, searchParams }: PageProps) {
  const { groupSlug, id, fileId } = await params;
  const { setlistpiece } = await searchParams;
  const player = await getPlayerData(groupSlug, id, fileId, { fromSetListPieceId: searchParamId(setlistpiece) });
  if (!player) {
    notFound();
  }

  // Keyed by File, so switching File starts the player afresh.
  return <PlayerView key={player.file.id} {...player} />;
}
