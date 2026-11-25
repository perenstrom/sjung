// PROTOTYPE (PER-495): Home at the Group's own address, showing its Current Set
// lists in switchable variants (?variant=A|B|C|D, ?n=<how many Current lists>).
// Throwaway: lives only on prototype/per-495-home-current-set-lists.

import { Suspense } from "react";

import { getGroups } from "@/app/actions/groups";
import { getSetListDetail, getSetLists } from "@/app/actions/setlists";
import { BreadcrumbRegistrar } from "@/components/BreadcrumbRegistrar";
import { HomeCurrentSetListsPrototype, type HomeSetList } from "@/components/HomeCurrentSetListsPrototype";
import { createGroupAncestor } from "@/lib/breadcrumbs";
import { formatDate } from "@/lib/format-date";

type PageProps = {
  params: Promise<{ groupSlug: string }>;
};

export default async function TenantGroupHomePrototypePage({ params }: PageProps) {
  const { groupSlug } = await params;
  const [setLists, groups] = await Promise.all([getSetLists(groupSlug), getGroups()]);
  const groupName = groups.find((group) => group.slug === groupSlug)?.name ?? groupSlug;

  let current = setLists.filter((setList) => setList.current);
  // PROTOTYPE fallback so the page has something to show on a dev DB without
  // Current Set lists: borrow the three most recently changed ones.
  const borrowed = current.length === 0;
  if (borrowed) current = setLists.slice(0, 3);

  const details = await Promise.all(current.map((setList) => getSetListDetail(groupSlug, setList.id)));
  const homeSetLists: HomeSetList[] = current.flatMap((setList, index) => {
    const detail = details[index];
    if (!detail) return [];
    return [
      {
        id: setList.id,
        slug: setList.slug,
        name: setList.name,
        dateLabel: formatDate(setList.date),
        steps: detail.steps.map((step) =>
          step.kind === "piece"
            ? { kind: "piece" as const, id: step.id, pieceName: step.piece.name, pieceSlug: step.piece.slug }
            : { kind: "note" as const, id: step.id, content: step.content },
        ),
      },
    ];
  });

  return (
    <div className="space-y-4 pb-28 md:space-y-6">
      <BreadcrumbRegistrar
        trail={{
          visibility: "visible",
          ancestors: [createGroupAncestor(groupSlug, groupName)],
          tail: { kind: "static", label: "Hem" },
        }}
      />
      <h1 className="text-2xl font-semibold break-words">{groupName}</h1>
      {borrowed ? (
        <p className="rounded-md border border-dashed p-2 text-xs text-muted-foreground">
          Prototyp: inga repertoarer är aktuella, så de tre senast ändrade visas i stället.
        </p>
      ) : null}
      <Suspense>
        <HomeCurrentSetListsPrototype groupSlug={groupSlug} setLists={homeSetLists} />
      </Suspense>
    </div>
  );
}
