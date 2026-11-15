"use client";

import { useEditMode } from "@/components/EditModeContext";
import { AddPieceCreditRow } from "@/components/pieces/AddPieceCreditRow";
import { PieceCreditsList } from "@/components/pieces/PieceCreditsList";
import { RemovableCreditsList } from "@/components/pieces/RemovableCreditsList";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { Person, PieceCredit } from "@/types/piece-credit-dialog";

type PieceDetailCredit = PieceCredit & { person: { name: string } };

type PieceDetailCreditsSectionProps = {
  groupSlug: string;
  pieceId: string;
  pieceName: string;
  credits: PieceDetailCredit[];
  people: Person[];
};

export function PieceDetailCreditsSection(props: PieceDetailCreditsSectionProps) {
  const { isEditing } = useEditMode();
  // Remount on every toggle so leaving edit mode discards a half-filled add row.
  return (
    <PieceDetailCreditsCard
      key={isEditing ? "edit" : "read"}
      readOnly={!isEditing}
      {...props}
    />
  );
}

function PieceDetailCreditsCard({
  readOnly,
  groupSlug,
  pieceId,
  credits,
  people,
}: PieceDetailCreditsSectionProps & { readOnly: boolean }) {
  return (
    <Card variant="section">
      <CardHeader className="flex flex-wrap items-center justify-between gap-2 space-y-0">
        <h2 className="text-lg leading-8 font-medium">Medverkande</h2>
      </CardHeader>
      <CardContent className="space-y-3">
        {credits.length === 0 ? (
          <p className="text-sm text-muted-foreground">Inga medverkande tillagda ännu.</p>
        ) : readOnly ? (
          <PieceCreditsList credits={credits} className="space-y-2" />
        ) : (
          <RemovableCreditsList
            groupSlug={groupSlug}
            pieceId={pieceId}
            credits={credits}
            className="space-y-2"
          />
        )}

        {readOnly ? null : (
          <div className="border-t pt-3">
            <AddPieceCreditRow
              groupSlug={groupSlug}
              pieceId={pieceId}
              people={people}
              credits={credits}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
