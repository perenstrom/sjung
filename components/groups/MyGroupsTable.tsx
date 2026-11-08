"use client";

import Link from "next/link";
import { useState } from "react";
import { Ellipsis, Pencil, Trash2, Users } from "lucide-react";

import { DeleteGroupDialog } from "@/components/DeleteGroupDialog";
import { EditGroupDialog } from "@/components/EditGroupDialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MobileList, MobileListEmpty, MobileListRow } from "@/components/ui/mobile-list";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { myGroupActions, type MyGroupAction } from "@/lib/groups";

export type MyGroupsTableRow = {
  id: string;
  name: string;
  slug: string;
  isCreator: boolean;
  canManageMembers: boolean;
};

const EMPTY_LABEL = "Inga grupper ännu.";

/** My groups as a table from `md` up and as the shared mobile list below it. */
export function MyGroupsTable({ groups }: { groups: MyGroupsTableRow[] }) {
  return (
    <>
      <MobileList>
        {groups.length === 0 ? (
          <MobileListEmpty>{EMPTY_LABEL}</MobileListEmpty>
        ) : (
          groups.map((group) => (
            <MobileListRow
              key={group.id}
              primary={group.name}
              trailing={<MyGroupActionsMenu group={group} />}
            />
          ))
        )}
      </MobileList>

      <div className="max-md:hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Namn</TableHead>
              <TableHead className="w-[340px] text-right">Åtgärder</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} className="text-muted-foreground">
                  {EMPTY_LABEL}
                </TableCell>
              </TableRow>
            ) : (
              groups.map((group) => (
                <TableRow key={group.id}>
                  <TableCell>{group.name}</TableCell>
                  <TableCell className="text-right">
                    <MyGroupActionButtons group={group} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

function MyGroupActionButtons({ group }: { group: MyGroupsTableRow }) {
  const actions = myGroupActions(group);
  if (actions.length === 0) {
    return <span className="text-muted-foreground">–</span>;
  }

  return (
    <div className="flex justify-end gap-2">
      {actions.map((action) => {
        switch (action) {
          case "members":
            return (
              <Button key={action} asChild variant="outline" size="sm">
                <Link href={membersHref(group)}>Medlemmar</Link>
              </Button>
            );
          case "edit":
            return <EditGroupDialog key={action} group={group} />;
          case "delete":
            return <DeleteGroupDialog key={action} group={group} />;
        }
      })}
    </div>
  );
}

/**
 * The mobile row's "⋯" menu. The edit and delete dialogs live outside the menu,
 * since the menu unmounts its items as soon as one is chosen.
 */
type MyGroupDialog = Exclude<MyGroupAction, "members">;

function MyGroupActionsMenu({ group }: { group: MyGroupsTableRow }) {
  const [openDialog, setOpenDialog] = useState<MyGroupDialog | null>(null);
  const actions = myGroupActions(group);
  if (actions.length === 0) {
    return null;
  }

  function dialogOpenChange(dialog: MyGroupDialog) {
    return (open: boolean) => setOpenDialog(open ? dialog : null);
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={`Åtgärder för ${group.name}`}>
            <Ellipsis className="size-4" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {actions.map((action) => {
            switch (action) {
              case "members":
                return (
                  <DropdownMenuItem key={action} asChild>
                    <Link href={membersHref(group)}>
                      <Users aria-hidden="true" />
                      Medlemmar
                    </Link>
                  </DropdownMenuItem>
                );
              case "edit":
                return (
                  <DropdownMenuItem key={action} onSelect={() => setOpenDialog("edit")}>
                    <Pencil aria-hidden="true" />
                    Redigera
                  </DropdownMenuItem>
                );
              case "delete":
                return (
                  <DropdownMenuItem
                    key={action}
                    variant="destructive"
                    onSelect={() => setOpenDialog("delete")}
                  >
                    <Trash2 aria-hidden="true" />
                    Ta bort
                  </DropdownMenuItem>
                );
            }
          })}
        </DropdownMenuContent>
      </DropdownMenu>
      {actions.includes("edit") ? (
        <EditGroupDialog
          group={group}
          open={openDialog === "edit"}
          onOpenChange={dialogOpenChange("edit")}
        />
      ) : null}
      {actions.includes("delete") ? (
        <DeleteGroupDialog
          group={group}
          open={openDialog === "delete"}
          onOpenChange={dialogOpenChange("delete")}
        />
      ) : null}
    </>
  );
}

function membersHref(group: MyGroupsTableRow): string {
  return `/app/${group.slug}/members`;
}
