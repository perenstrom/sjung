import { getCategories, getCreditRoles } from "@/app/actions/pieces";
import { getSetListDetail, getSetListPieceOptions } from "@/app/actions/setlists";
import { getGroups } from "@/app/actions/groups";
import { getPeople } from "@/app/actions/people";
import { BreadcrumbRegistrar } from "@/components/BreadcrumbRegistrar";
import { EditModeProvider, EditOnly } from "@/components/EditModeContext";
import { findGroupAccess } from "@/lib/group-access";
import { heldEditCapabilities } from "@/lib/edit-mode";
import { PageHeader } from "@/components/PageHeader";
import { SetListName } from "@/components/setlists/SetListName";
import { PieceCategoriesProvider } from "@/components/pieces/CategoryPicker";
import { PiecesTable } from "@/components/pieces/PiecesTable";
import { AddPieceToSetListForm } from "@/components/AddPieceToSetListForm";
import { AddRunningOrderNoteSection } from "@/components/setlists/AddRunningOrderNoteSection";
import { createGroupAncestor, createSetListsAncestor, setListCrumbLabel } from "@/lib/breadcrumbs";
import { formatDate } from "@/lib/format-date";
import { notFound, permanentRedirect } from "next/navigation";
import { findPageContent } from "@/lib/content-page";
import { groupSetListPath } from "@/lib/groups/routes";

type PageProps = {
  params: Promise<{ groupSlug: string; setListSlug: string }>;
};

export default async function TenantSetListDetailPage({ params }: PageProps) {
  const { groupSlug, setListSlug } = await params;
  const match = await findPageContent(groupSlug, "setList", setListSlug);
  // A link by id always works and moves to the Slug URL (ADR-0011).
  if (match.slug !== setListSlug) {
    permanentRedirect(groupSetListPath(groupSlug, match));
  }
  const [setList, pieces, people, creditRoles, categories, groups, access] = await Promise.all([
    getSetListDetail(groupSlug, match.id),
    getSetListPieceOptions(groupSlug),
    getPeople(groupSlug),
    getCreditRoles(groupSlug),
    getCategories(groupSlug),
    getGroups(),
    findGroupAccess(groupSlug),
  ]);

  if (!setList) {
    notFound();
  }
  const groupName = groups.find((group) => group.slug === groupSlug)?.name ?? groupSlug;

  return (
    <EditModeProvider
      capabilities={heldEditCapabilities(access, ["manageContent", "reorderSetLists", "manageRunningOrderNotes"])}
    >
      <PieceCategoriesProvider categories={categories}>
        <div className="space-y-4 md:space-y-6">
          <BreadcrumbRegistrar
            trail={{
              visibility: "visible",
              ancestors: [createGroupAncestor(groupSlug, groupName), createSetListsAncestor(groupSlug)],
              tail: { kind: "static", label: setListCrumbLabel(setList.name) },
            }}
          />
          <div className="space-y-2">
            <PageHeader title={<SetListName current={setList.current}>{setList.name}</SetListName>} />
            <p className="text-sm text-muted-foreground">Datum: {formatDate(setList.date) ?? "–"}</p>
          </div>

          <section aria-label="Ordning">
            <PiecesTable
              setList={{ id: setList.id, steps: setList.steps }}
              people={people}
              creditRoles={creditRoles}
              groupSlug={groupSlug}
            />
          </section>

          <EditOnly>
            <section className="space-y-3">
              <h2 className="text-lg font-medium">Lägg till stycke</h2>
              <AddPieceToSetListForm groupSlug={groupSlug} setListId={setList.id} pieces={pieces} />
            </section>
          </EditOnly>
          <AddRunningOrderNoteSection groupSlug={groupSlug} setListId={setList.id} />
        </div>
      </PieceCategoriesProvider>
    </EditModeProvider>
  );
}
