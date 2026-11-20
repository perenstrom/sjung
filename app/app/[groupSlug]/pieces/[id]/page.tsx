import { getPeople } from "@/app/actions/people";
import { getCategories, getCreditRoles, getPieceDetail } from "@/app/actions/pieces";
import { getSetLists } from "@/app/actions/setlists";
import { getGroups } from "@/app/actions/groups";
import { BreadcrumbRegistrar } from "@/components/BreadcrumbRegistrar";
import { EditModeProvider } from "@/components/EditModeContext";
import { findGroupAccess } from "@/lib/group-access";
import { PieceDetailCreditsSection } from "@/components/PieceDetailCreditsSection";
import { PieceDetailNotesSection } from "@/components/PieceDetailNotesSection";
import { PieceMetadataSection } from "@/components/PieceMetadataSection";
import { PieceSetListsSection } from "@/components/PieceSetListsSection";
import { PieceCategoriesProvider } from "@/components/pieces/CategoryPicker";
import { PieceFilesAndLinks } from "@/components/pieces/files-and-links/PieceFilesAndLinks";
import { toPieceFilesAndLinks } from "@/components/pieces/files-and-links/toPieceFilesAndLinks";
import { PieceDetailSectionLayout, PieceDetailSectionStack } from "@/components/pieces/PieceDetailSectionLayout";
import { pieceDetailTrail } from "@/lib/breadcrumbs";
import { fromSetListIdParam } from "@/lib/pieces/href";
import { notFound } from "next/navigation";

type PageProps = {
  params: Promise<{ groupSlug: string; id: string }>;
  searchParams: Promise<{ setlist?: string | string[] }>;
};

export default async function TenantPieceDetailPage({ params, searchParams }: PageProps) {
  const [{ groupSlug, id }, { setlist }] = await Promise.all([params, searchParams]);
  const [piece, people, creditRoles, categories, setLists, groups, access] = await Promise.all([
    getPieceDetail(groupSlug, id),
    getPeople(groupSlug),
    getCreditRoles(groupSlug),
    getCategories(groupSlug),
    getSetLists(groupSlug),
    getGroups(),
    findGroupAccess(groupSlug),
  ]);

  if (!piece) {
    notFound();
  }
  const groupName = groups.find((group) => group.slug === groupSlug)?.name ?? groupSlug;

  return (
    <EditModeProvider canEdit={access?.can("manageContent") ?? false}>
      <PieceCategoriesProvider categories={categories}>
        <div className="space-y-4 md:space-y-6">
          <BreadcrumbRegistrar
            trail={pieceDetailTrail({
              groupSlug,
              groupName,
              pieceName: piece.name,
              setLists,
              fromSetListId: fromSetListIdParam(setlist),
            })}
          />
          <PieceMetadataSection
            key={piece.id}
            groupSlug={groupSlug}
            pieceId={piece.id}
            initialName={piece.name}
            aliases={piece.aliases}
          />

          <PieceDetailSectionStack>
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
              creditRoles={creditRoles}
            />

            <PieceDetailSectionLayout title="Filer och länkar">
              <PieceFilesAndLinks
                layout="detail"
                groupSlug={groupSlug}
                piece={{ id: piece.id, name: piece.name }}
                filesAndLinks={toPieceFilesAndLinks(piece)}
              />
            </PieceDetailSectionLayout>

            <PieceDetailNotesSection
              key={`notes-${piece.id}`}
              groupSlug={groupSlug}
              pieceId={piece.id}
              notes={piece.notes}
            />

            <PieceSetListsSection
              groupSlug={groupSlug}
              pieceId={piece.id}
              setLists={piece.setLists}
              allSetLists={setLists.map((sl) => ({ id: sl.id, name: sl.name }))}
            />
          </PieceDetailSectionStack>
        </div>
      </PieceCategoriesProvider>
    </EditModeProvider>
  );
}
