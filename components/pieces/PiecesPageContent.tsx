"use client";

import { useState } from "react";

import { CreatePieceDialog } from "@/components/CreatePieceDialog";
import { useEditMode } from "@/components/EditModeContext";
import { PageHeader } from "@/components/PageHeader";
import { PieceImportPanel } from "@/components/pieces/import/PieceImportPanel";
import { SearchablePiecesTable } from "@/components/pieces/SearchablePiecesTable";
import { Button } from "@/components/ui/button";
import type { ImportGroup } from "@/lib/pieces/import";
import type { PieceWithRelations } from "@/lib/pieces/types";
import type { Person } from "@/types/piece-credit-dialog";

/**
 * Alla noter below its breadcrumbs: the header with its edit actions, and
 * the Pieces table, which a Piece import takes the place of while it is open.
 */
export function PiecesPageContent({
  groupSlug,
  pieces,
  people,
  creditRoles,
  importGroup,
}: {
  groupSlug: string;
  pieces: PieceWithRelations[];
  people: Person[];
  creditRoles: string[];
  importGroup: ImportGroup;
}) {
  const { isEditing } = useEditMode();
  const [isImportOpen, setIsImportOpen] = useState(false);
  const importing = isEditing && isImportOpen;

  return (
    <>
      <PageHeader
        title="Alla noter"
        editActions={
          <>
            <Button variant="outline" onClick={() => setIsImportOpen(true)} disabled={importing}>
              Importera
            </Button>
            <CreatePieceDialog people={people} creditRoles={creditRoles} groupSlug={groupSlug} />
          </>
        }
      />

      {importing ? (
        <PieceImportPanel groupSlug={groupSlug} group={importGroup} onClose={() => setIsImportOpen(false)} />
      ) : (
        <SearchablePiecesTable
          pieces={pieces}
          people={people}
          creditRoles={creditRoles}
          groupSlug={groupSlug}
        />
      )}
    </>
  );
}
