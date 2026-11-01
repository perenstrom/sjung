import { getSetLists } from "@/app/actions/setlists";
import { getGroups } from "@/app/actions/groups";
import { BreadcrumbRegistrar } from "@/components/BreadcrumbRegistrar";
import { CreateSetListDialog } from "@/components/CreateSetListDialog";
import { EditModeProvider } from "@/components/EditModeContext";
import { PageHeader } from "@/components/PageHeader";
import { SetListsTable } from "@/components/setlists/SetListsTable";
import { createGroupAncestor } from "@/lib/breadcrumbs";

type PageProps = {
  params: Promise<{ groupSlug: string }>;
};

function formatSetListDate(date: Date | null): string {
  if (!date) {
    return "–";
  }
  return new Intl.DateTimeFormat("sv-SE").format(date);
}

export default async function TenantSetListsPage({ params }: PageProps) {
  const { groupSlug } = await params;
  const [setLists, groups] = await Promise.all([getSetLists(groupSlug), getGroups()]);
  const groupName = groups.find((group) => group.slug === groupSlug)?.name ?? groupSlug;

  return (
    <EditModeProvider>
      <div className="space-y-6">
        <BreadcrumbRegistrar
          trail={{
            visibility: "visible",
            ancestors: [createGroupAncestor(groupSlug, groupName)],
            tail: { kind: "static", label: "Repertoarer" },
          }}
        />
        <PageHeader
          title="Repertoarer"
          editActions={<CreateSetListDialog groupSlug={groupSlug} />}
        />

        <SetListsTable
          groupSlug={groupSlug}
          setLists={setLists.map((setList) => ({
            id: setList.id,
            name: setList.name,
            date: setList.date,
            dateLabel: formatSetListDate(setList.date),
          }))}
        />
      </div>
    </EditModeProvider>
  );
}
