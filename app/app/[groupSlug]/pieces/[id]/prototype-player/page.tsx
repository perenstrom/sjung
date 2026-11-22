// PROTOTYPE (PER-458): the player view, opened from a Playable File. Throwaway.

import { notFound } from "next/navigation";
import { Suspense } from "react";

import { getPieceDetail } from "@/app/actions/pieces";
import { getSetListDetail } from "@/app/actions/setlists";
import { PlayerPrototype } from "@/components/pieces/player-prototype/PlayerPrototype";
import { fromSetListIdParam } from "@/lib/pieces/href";

type PageProps = {
  params: Promise<{ groupSlug: string; id: string }>;
  searchParams: Promise<{ setlist?: string | string[] }>;
};

export default async function PlayerPrototypePage({ params, searchParams }: PageProps) {
  const [{ groupSlug, id }, { setlist }] = await Promise.all([params, searchParams]);
  const setListId = fromSetListIdParam(setlist);
  const [piece, setList] = await Promise.all([
    getPieceDetail(groupSlug, id),
    setListId ? getSetListDetail(groupSlug, setListId) : null,
  ]);
  if (!piece) notFound();

  return (
    <Suspense>
      <PlayerPrototype
        groupSlug={groupSlug}
        pieceId={piece.id}
        pieceName={piece.name}
        setList={setList ? { id: setList.id, name: setList.name } : undefined}
      />
    </Suspense>
  );
}
