import {
  addPieceToSetList,
  appendSetListNote,
  getSetListDetail,
  getSetListPieceOptions,
} from "@/app/actions/setlists";
import { getGroups } from "@/app/actions/groups";
import { getPeople } from "@/app/actions/people";
import { BreadcrumbRegistrar } from "@/components/BreadcrumbRegistrar";
import { EditModeProvider, EditOnly } from "@/components/EditModeContext";
import { findGroupAccess } from "@/lib/group-access";
import { PageHeader } from "@/components/PageHeader";
import { PiecesTable } from "@/components/pieces/PiecesTable";
import { SetListPiecePicker } from "@/components/SetListPiecePicker";
import {
  createGroupAncestor,
  createSetListsAncestor,
  setListCrumbLabel,
} from "@/lib/breadcrumbs";
import { formatDate } from "@/lib/format-date";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { notFound } from "next/navigation";

type PageProps = {
  params: Promise<{ groupSlug: string; id: string }>;
};

export default async function TenantSetListDetailPage({ params }: PageProps) {
  const { groupSlug, id } = await params;
  const [setList, pieces, people, groups, access] = await Promise.all([
    getSetListDetail(groupSlug, id),
    getSetListPieceOptions(groupSlug),
    getPeople(groupSlug),
    getGroups(),
    findGroupAccess(groupSlug),
  ]);

  if (!setList) {
    notFound();
  }
  const groupName = groups.find((group) => group.slug === groupSlug)?.name ?? groupSlug;

  return (
    <EditModeProvider canEdit={access?.can("manageContent") ?? false}>
      <div className="space-y-4 md:space-y-6">
        <BreadcrumbRegistrar
          trail={{
            visibility: "visible",
            ancestors: [
              createGroupAncestor(groupSlug, groupName),
              createSetListsAncestor(groupSlug),
            ],
            tail: { kind: "static", label: setListCrumbLabel(setList.name) },
          }}
        />
        <div className="space-y-2">
          <PageHeader title={setList.name} />
          <p className="text-sm text-muted-foreground">Datum: {formatDate(setList.date) ?? "–"}</p>
        </div>

        <section className="space-y-3">
          <h2 className="text-lg font-medium">Ordning</h2>
          <PiecesTable
            setList={{ id: setList.id, steps: setList.steps }}
            people={people}
            groupSlug={groupSlug}
          />
        </section>

        <EditOnly>
          <section className="space-y-3">
            <h2 className="text-lg font-medium">Lägg till stycke</h2>
            <form action={addPieceToSetList} className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <input type="hidden" name="groupSlug" value={groupSlug} />
              <input type="hidden" name="setListId" value={setList.id} />
              <div className="sm:w-80">
                <SetListPiecePicker pieces={pieces} />
              </div>
              <Button type="submit" disabled={pieces.length === 0}>
                Lägg till
              </Button>
            </form>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-medium">Lägg till anteckning</h2>
            <form action={appendSetListNote} className="space-y-3">
              <input type="hidden" name="groupSlug" value={groupSlug} />
              <input type="hidden" name="setListId" value={setList.id} />
              <label className="block space-y-2">
                <span className="text-sm font-medium">Lägg till anteckning</span>
                <Textarea name="content" required rows={4} className="min-h-[6rem]" />
              </label>
              <Button type="submit">Lägg till anteckning</Button>
            </form>
          </section>
        </EditOnly>
      </div>
    </EditModeProvider>
  );
}
