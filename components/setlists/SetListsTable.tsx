"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { DeleteSetListDialog } from "@/components/DeleteSetListDialog";
import { EditSetListDialog } from "@/components/EditSetListDialog";
import { useEditMode } from "@/components/EditModeContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MobileList, MobileListEmpty, MobileListRow } from "@/components/ui/mobile-list";

export type SetListsTableRow = {
  id: string;
  name: string;
  date: Date | null;
  /**
   * Formatted on the server so the date doesn't shift with the viewer's time
   * zone. Null when the set list has no date.
   */
  dateLabel: string | null;
};

/** Set lists as a table from `md` up and as the shared mobile list below it. */
export function SetListsTable({
  setLists,
  groupSlug,
}: {
  setLists: SetListsTableRow[];
  groupSlug: string;
}) {
  const { isEditing } = useEditMode();

  return (
    <>
      <SetListsMobileList setLists={setLists} groupSlug={groupSlug} isEditing={isEditing} />
      <div className="max-md:hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Namn</TableHead>
              <TableHead>Datum</TableHead>
              {isEditing ? (
                <TableHead className="w-[1%] whitespace-nowrap">Åtgärder</TableHead>
              ) : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {setLists.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isEditing ? 3 : 2} className="text-muted-foreground">
                  Inga repertoarer tillagda ännu.
                </TableCell>
              </TableRow>
            ) : (
              setLists.map((setList) => (
                <TableRow key={setList.id}>
                  <TableCell>
                    <Link
                      href={`/app/${groupSlug}/setlists/${setList.id}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {setList.name}
                    </Link>
                  </TableCell>
                  <TableCell>{setList.dateLabel ?? "–"}</TableCell>
                  {isEditing ? (
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <SetListRowActions groupSlug={groupSlug} setList={setList} />
                      </div>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

function SetListsMobileList({
  setLists,
  groupSlug,
  isEditing,
}: {
  setLists: SetListsTableRow[];
  groupSlug: string;
  isEditing: boolean;
}) {
  return (
    <MobileList>
      {setLists.length === 0 ? (
        <MobileListEmpty>Inga repertoarer tillagda ännu.</MobileListEmpty>
      ) : (
        setLists.map((setList) => (
          <MobileListRow
            key={setList.id}
            href={`/app/${groupSlug}/setlists/${setList.id}`}
            primary={setList.name}
            secondary={setList.dateLabel}
            trailing={
              isEditing ? (
                <SetListRowActions groupSlug={groupSlug} setList={setList} trigger="icon" />
              ) : (
                <ChevronRight className="text-muted-foreground size-4" aria-hidden="true" />
              )
            }
          />
        ))
      )}
    </MobileList>
  );
}

function SetListRowActions({
  groupSlug,
  setList,
  trigger,
}: {
  groupSlug: string;
  setList: SetListsTableRow;
  trigger?: "button" | "icon";
}) {
  return (
    <>
      <EditSetListDialog
        groupSlug={groupSlug}
        setList={{ id: setList.id, name: setList.name, date: setList.date }}
        trigger={trigger}
      />
      <DeleteSetListDialog
        groupSlug={groupSlug}
        setList={{ id: setList.id, name: setList.name }}
        trigger={trigger}
      />
    </>
  );
}
