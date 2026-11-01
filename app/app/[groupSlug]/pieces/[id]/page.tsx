import { getPeople } from "@/app/actions/people";
import { getPieceDetail } from "@/app/actions/pieces";
import { getSetLists } from "@/app/actions/setlists";
import { getGroups } from "@/app/actions/groups";
import { BreadcrumbRegistrar } from "@/components/BreadcrumbRegistrar";
import { EditModeProvider } from "@/components/EditModeContext";
import { PieceDetailCreditsSection } from "@/components/PieceDetailCreditsSection";
import { PieceDetailFilesSection } from "@/components/PieceDetailFilesSection";
import { PieceDetailLinksSection } from "@/components/PieceDetailLinksSection";
import { PieceMetadataSection } from "@/components/PieceMetadataSection";
import { PieceSetListsSection } from "@/components/PieceSetListsSection";
import { createGroupAncestor } from "@/lib/breadcrumbs";
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

        <PieceDetailCreditsSection
          groupSlug={groupSlug}
          pieceId={piece.id}
          pieceName={piece.name}
          credits={piece.credits.map((credit) => ({
            personId: credit.personId,
            role: credit.role,
            person: { name: credit.person.name },
          }))}
          people={people}
        />

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
