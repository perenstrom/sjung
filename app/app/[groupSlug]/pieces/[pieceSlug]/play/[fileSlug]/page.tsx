import { notFound, permanentRedirect } from "next/navigation";

import { PlayerView } from "@/components/player/PlayerView";
import { findPageContent } from "@/lib/content-page";
import { playerHref } from "@/lib/pieces/href";
import { searchParamId } from "@/lib/search-params";
import { getPlayerData } from "@/lib/pieces/player";

type PageProps = {
  params: Promise<{ groupSlug: string; pieceSlug: string; fileSlug: string }>;
  searchParams: Promise<{ setlistpiece?: string | string[] }>;
};

/** The player, open on one of the Piece's Playable Files (`playerHref`). */
export default async function PiecePlayerPage({ params, searchParams }: PageProps) {
  const { groupSlug, pieceSlug, fileSlug } = await params;
  const fromSetListPieceId = searchParamId((await searchParams).setlistpiece);
  const [piece, file] = await Promise.all([
    findPageContent(groupSlug, "piece", pieceSlug),
    findPageContent(groupSlug, "file", fileSlug),
  ]);
  // Links by id, for either or both, always work and move to the Slug URL (ADR-0011).
  if (piece.slug !== pieceSlug || file.slug !== fileSlug) {
    permanentRedirect(playerHref(groupSlug, piece, file, { fromSetListPieceId }));
  }
  const player = await getPlayerData(groupSlug, piece.id, file.id, { fromSetListPieceId });
  if (!player) {
    notFound();
  }

  // Keyed by File, so switching File starts the player afresh.
  return <PlayerView key={player.file.id} {...player} />;
}
