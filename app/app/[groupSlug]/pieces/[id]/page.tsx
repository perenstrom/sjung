import { getPeople } from "@/app/actions/people";
import { getPieceDetail } from "@/app/actions/pieces";
import { getSetLists } from "@/app/actions/setlists";
import { getGroups } from "@/app/actions/groups";
import { BreadcrumbRegistrar } from "@/components/BreadcrumbRegistrar";
import { EditPieceDialog } from "@/components/EditPieceDialog";
import { EditModeProvider, EditOnly } from "@/components/EditModeContext";
import { PieceDetailFilesSection } from "@/components/PieceDetailFilesSection";
import { PieceDetailLinksSection } from "@/components/PieceDetailLinksSection";
import { PieceMetadataSection } from "@/components/PieceMetadataSection";
import { PieceSetListsSection } from "@/components/PieceSetListsSection";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { createGroupAncestor } from "@/lib/breadcrumbs";
import { sortCreditsForDisplay } from "@/lib/pieces/credits";
import { notFound } from "next/navigation";

type PageProps = {
  params: Promise<{ groupSlug: string; id: string }>;
};

export default async function TenantPieceDetailPage({ params }: PageProps) {
  const { groupSlug, id } = await params;
  const [piece, people, setLists, groups] = await Promise.all([
    getPieceDetail(groupSlug, id),
    getPeople(groupSlug),
    getSetLists(groupSlug),
    getGroups(),
  ]);

  if (!piece) {
    notFound();
  }
  const groupName = groups.find((group) => group.slug === groupSlug)?.name ?? groupSlug;

  const sortedCredits = sortCreditsForDisplay(piece.credits);

  return (
    <EditModeProvider>
      <div className="space-y-6">
        <BreadcrumbRegistrar
          trail={{
            visibility: "visible",
            ancestors: [
              createGroupAncestor(groupSlug, groupName),
              { label: "Noter", href: `/app/${groupSlug}` },
            ],
            tail: { kind: "static", label: piece.name || "Notstycke" },
          }}
        />
        <PieceMetadataSection
          key={piece.id}
          groupSlug={groupSlug}
          pieceId={piece.id}
          initialName={piece.name}
        />

        <Card>
          <CardHeader className="flex flex-wrap items-center justify-between gap-2 space-y-0">
            <h2 className="text-lg leading-8 font-medium">Medverkande</h2>
            <EditOnly>
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
            </EditOnly>
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

        <PieceDetailFilesSection
          groupSlug={groupSlug}
          pieceId={piece.id}
          pieceName={piece.name}
          files={piece.files.map((file) => ({
            id: file.id,
            displayName: file.displayName,
            size: file.size,
            createdAt: file.createdAt,
          }))}
        />

        <PieceDetailLinksSection
          groupSlug={groupSlug}
          pieceId={piece.id}
          pieceName={piece.name}
          links={piece.links.map((link) => ({
            id: link.id,
            url: link.url,
            label: link.label,
          }))}
        />

        <PieceSetListsSection
          groupSlug={groupSlug}
          pieceId={piece.id}
          entries={piece.setListEntries}
          allSetLists={setLists.map((sl) => ({ id: sl.id, name: sl.name }))}
        />
      </div>
    </EditModeProvider>
  );
}
