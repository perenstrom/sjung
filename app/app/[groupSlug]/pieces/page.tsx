import { getCategories, getCreditRoles, getPieceImportGroup, getPieces } from "@/app/actions/pieces";
import { getPeople } from "@/app/actions/people";
import { BreadcrumbRegistrar } from "@/components/BreadcrumbRegistrar";
import { EditModeProvider } from "@/components/EditModeContext";
import { findGroupAccess } from "@/lib/group-access";
import { PieceCategoriesProvider } from "@/components/pieces/CategoryPicker";
import { PiecesPageContent } from "@/components/pieces/PiecesPageContent";
import { getGroups } from "@/app/actions/groups";
import { createGroupAncestor } from "@/lib/breadcrumbs";
import { EMPTY_IMPORT_GROUP } from "@/lib/pieces/import";

type PageProps = {
  params: Promise<{ groupSlug: string }>;
};

export default async function GroupPiecesPage({ params }: PageProps) {
  const { groupSlug } = await params;
  const access = await findGroupAccess(groupSlug);
  const canEdit = access?.can("manageContent") ?? false;
  const [pieces, people, creditRoles, categories, groups, importGroup] = await Promise.all([
    getPieces(groupSlug),
    getPeople(groupSlug),
    getCreditRoles(groupSlug),
    getCategories(groupSlug),
    getGroups(),
    // Only Members who can change content can import.
    canEdit ? getPieceImportGroup(groupSlug) : EMPTY_IMPORT_GROUP,
  ]);
  const groupName = groups.find((group) => group.slug === groupSlug)?.name ?? groupSlug;

  return (
    <EditModeProvider canEdit={canEdit}>
      <PieceCategoriesProvider categories={categories}>
        <div className="space-y-4 md:space-y-6">
          <BreadcrumbRegistrar
            trail={{
              visibility: "visible",
              ancestors: [createGroupAncestor(groupSlug, groupName)],
              tail: { kind: "static", label: "Alla noter" },
            }}
          />
          <PiecesPageContent
            groupSlug={groupSlug}
            pieces={pieces}
            people={people}
            creditRoles={creditRoles}
            importGroup={importGroup}
          />
        </div>
      </PieceCategoriesProvider>
    </EditModeProvider>
  );
}
