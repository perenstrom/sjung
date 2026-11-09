import { getGroups } from "@/app/actions/groups";
import { BreadcrumbRegistrar } from "@/components/BreadcrumbRegistrar";
import { MyGroupsView } from "@/components/groups/MyGroupsView";

export default async function GroupsPage() {
  const groups = await getGroups();

  return (
    <div className="space-y-4 md:space-y-6">
      <BreadcrumbRegistrar
        trail={{
          visibility: "visible",
          ancestors: [],
          tail: { kind: "static", label: "Mina grupper" },
        }}
      />
      <MyGroupsView groups={groups} />
    </div>
  );
}
