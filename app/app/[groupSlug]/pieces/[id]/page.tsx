import { getPeople } from "@/app/actions/people";
import { getPieceDetail } from "@/app/actions/pieces";
import { getSetLists } from "@/app/actions/setlists";
import { EditPieceDialog } from "@/components/EditPieceDialog";
import { PieceDetailFilesSection } from "@/components/PieceDetailFilesSection";
import { PieceDetailLinksList } from "@/components/PieceDetailLinksList";
import { PieceLinksDialog } from "@/components/PieceLinksDialog";
import { PieceMetadataSection } from "@/components/PieceMetadataSection";
import { PieceSetListsSection } from "@/components/PieceSetListsSection";
import type { Piece } from "@/components/PieceLinksDialog/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ROLES } from "@/lib/roles";
import { notFound } from "next/navigation";

type PageProps = {
  params: Promise<{ groupSlug: string; id: string }>;
};

export default async function TenantPieceDetailPage({ params }: PageProps) {
  const { groupSlug, id } = await params;
  const [piece, people, setLists] = await Promise.all([
    getPieceDetail(groupSlug, id),
    getPeople(groupSlug),
    getSetLists(groupSlug),
  ]);

  if (!piece) {
    notFound();
  }

  const pieceForLinksDialog: Piece = {
    id: piece.id,
    name: piece.name,
    files: piece.files.map((file) => ({
      id: file.id,
      displayName: file.displayName,
      size: file.size,
    })),
    links: piece.links.map((link) => ({
      id: link.id,
      url: link.url,
      label: link.label,
    })),
  };

  const sortedCredits = (() => {
    const roleBuckets = new Map<string, (typeof piece.credits)[number][]>();

    for (const credit of piece.credits) {
      const role = credit.role;
      const bucket = roleBuckets.get(role);
      if (bucket) bucket.push(credit);
      else roleBuckets.set(role, [credit]);
    }

    // Widen the set type so `roleBuckets` (string keys) can be checked safely.
    const knownRoleSet = new Set<string>(ROLES as unknown as string[]);
    const compareSv = (a: string, b: string) =>
      a.localeCompare(b, "sv-SE", { sensitivity: "base" });

    const knownRoles = ROLES.filter((role) => roleBuckets.has(role));
    const unknownRoles = [...roleBuckets.keys()]
      .filter((role) => !knownRoleSet.has(role))
      .sort(compareSv);

    const orderedRoles = [...knownRoles, ...unknownRoles];

    return orderedRoles.flatMap((role) => {
      const bucket = roleBuckets.get(role) ?? [];
      bucket.sort((a, b) => compareSv(a.person.name, b.person.name));
      return bucket;
    });
  })();

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">{piece.name}</h1>
      </div>

      <PieceMetadataSection
        key={piece.id}
        groupSlug={groupSlug}
        pieceId={piece.id}
        initialName={piece.name}
      />

      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-2 space-y-0">
          <h2 className="text-lg font-medium">Medverkande</h2>
          <EditPieceDialog
            creditsOnly
            groupSlug={groupSlug}
            people={people}
            piece={{
              id: piece.id,
              name: piece.name,
              credits: piece.credits.map((credit) => ({
                personId: credit.personId,
                role: credit.role,
              })),
            }}
          />
        </CardHeader>
        <CardContent className="space-y-3">
          {piece.credits.length === 0 ? (
            <p className="text-sm text-muted-foreground">Inga medverkande tillagda ännu.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {sortedCredits.map((credit) => (
                <li
                  key={`${credit.personId}:${credit.role}`}
                  className="flex items-center gap-3"
                >
                  <span className="font-medium">{credit.person.name}</span>
                  <span className="inline-flex items-center rounded-md border border-input bg-muted/50 px-2 py-0.5 text-xs text-muted-foreground">
                    {credit.role}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-2 space-y-0">
          <h2 className="text-lg font-medium">Filer och länkar</h2>
          <PieceLinksDialog
            groupSlug={groupSlug}
            piece={pieceForLinksDialog}
            refreshAfterMutations
          />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">Filer</h3>
            <PieceDetailFilesSection
              groupSlug={groupSlug}
              files={piece.files.map((file) => ({
                id: file.id,
                displayName: file.displayName,
                size: file.size,
                createdAt: file.createdAt,
              }))}
            />
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">Länkar</h3>
            <PieceDetailLinksList
              links={piece.links.map((link) => ({
                id: link.id,
                url: link.url,
                label: link.label,
              }))}
            />
          </div>
        </CardContent>
      </Card>

      <PieceSetListsSection
        groupSlug={groupSlug}
        pieceId={piece.id}
        entries={piece.setListEntries}
        allSetLists={setLists.map((sl) => ({ id: sl.id, name: sl.name }))}
      />
    </div>
  );
}
