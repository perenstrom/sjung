import { Users } from "lucide-react";

import { CreateGroupDialog } from "@/components/CreateGroupDialog";
import { MyGroupsTable, type MyGroupsTableRow } from "@/components/groups/MyGroupsTable";
import { EmptyState } from "@/components/ui/empty-state";

/**
 * The body of My groups. Without groups it shows an empty state that carries
 * the only "Skapa ny grupp" button, so the header has none.
 */
export function MyGroupsView({ groups }: { groups: MyGroupsTableRow[] }) {
  const isEmpty = groups.length === 0;

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Mina grupper</h1>
        {isEmpty ? null : <CreateGroupDialog />}
      </div>

      {isEmpty ? (
        <EmptyState
          icon={Users}
          heading="Du är inte med i någon grupp än"
          action={<CreateGroupDialog triggerVariant="outline" />}
        >
          <p className="text-balance">
            När någon bjuder in dig till en grupp får du en inbjudan via{" "}
            <span className="whitespace-nowrap">e-post</span>. Följ länken i mejlet för att gå med.
          </p>
        </EmptyState>
      ) : (
        <MyGroupsTable groups={groups} />
      )}
    </>
  );
}
