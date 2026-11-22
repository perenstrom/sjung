// PROTOTYPE (PER-458, PER-463): the player view, opened from a Playable File. Throwaway.

import { notFound } from "next/navigation";
import { Suspense } from "react";

import { getGroups } from "@/app/actions/groups";
import { getPieceDetail } from "@/app/actions/pieces";
import { getSetListDetail } from "@/app/actions/setlists";
import { PlayerPrototype } from "@/components/pieces/player-prototype/PlayerPrototype";
import { createGroupAncestor, createPiecesAncestor } from "@/lib/breadcrumbs";
import { fromSetListIdParam } from "@/lib/pieces/href";

type PageProps = {
  params: Promise<{ groupSlug: string; id: string }>;
  searchParams: Promise<{ setlist?: string | string[] }>;
};

export default async function PlayerPrototypePage({ params, searchParams }: PageProps) {
  const [{ groupSlug, id }, { setlist }] = await Promise.all([params, searchParams]);
  const setListId = fromSetListIdParam(setlist);
  const [piece, setList, groups] = await Promise.all([
    getPieceDetail(groupSlug, id),
    setListId ? getSetListDetail(groupSlug, setListId) : null,
    getGroups(),
  ]);
  if (!piece) notFound();
  const groupName = groups.find((group) => group.slug === groupSlug)?.name ?? groupSlug;

  return (
    <Suspense>
      <PlayerPrototype
        groupSlug={groupSlug}
        pieceId={piece.id}
        pieceName={piece.name}
        setList={setList ? { id: setList.id, name: setList.name } : undefined}
        trail={{
          visibility: "visible",
          ancestors: [
            createGroupAncestor(groupSlug, groupName),
            createPiecesAncestor(groupSlug),
            { label: piece.name, href: `/app/${groupSlug}/pieces/${piece.id}` },
          ],
          tail: { kind: "static", label: "Öva" },
        }}
      />
    </Suspense>
  );
}
