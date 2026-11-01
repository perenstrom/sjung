"use client";

import Link from "next/link";

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

export type SetListsTableRow = {
  id: string;
  name: string;
  date: Date | null;
  /** Formatted on the server so the date doesn't shift with the viewer's time zone. */
  dateLabel: string;
};

export function SetListsTable({
  setLists,
  groupSlug,
}: {
  setLists: SetListsTableRow[];
  groupSlug: string;
}) {
  const { isEditing } = useEditMode();

  return (
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
              <TableCell>{setList.dateLabel}</TableCell>
              {isEditing ? (
                <TableCell>
                  <div className="flex items-center gap-2">
                    <EditSetListDialog
                      groupSlug={groupSlug}
                      setList={{ id: setList.id, name: setList.name, date: setList.date }}
                    />
                    <DeleteSetListDialog
                      groupSlug={groupSlug}
                      setList={{ id: setList.id, name: setList.name }}
                    />
                  </div>
                </TableCell>
              ) : null}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
