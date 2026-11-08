import { getGroups } from "@/app/actions/groups";
import { BreadcrumbRegistrar } from "@/components/BreadcrumbRegistrar";
import { CreateGroupDialog } from "@/components/CreateGroupDialog";
import { MyGroupsTable } from "@/components/groups/MyGroupsTable";

export default async function GroupsPage() {
  const groups = await getGroups();

  return (
    <div className="space-y-4 md:space-y-6">
      <BreadcrumbRegistrar
        trail={{
          visibility: "visible",
          ancestors: [],
          tail: { kind: "static", label: "Grupphantering" },
        }}
      />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Grupper</h1>
        <CreateGroupDialog />
      </div>

      <MyGroupsTable groups={groups} />
    </div>
  );
}
