"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { removeCredit } from "@/app/actions/pieces";
import { useEditMode } from "@/components/EditModeContext";
import { AddPieceCreditRow } from "@/components/pieces/AddPieceCreditRow";
import { PieceCreditsList } from "@/components/pieces/PieceCreditsList";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getThrownMessage } from "@/lib/getThrownMessage";
import { creditKey, type CreditForDisplay } from "@/lib/pieces/credits";
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
  const router = useRouter();
  const [removingKey, setRemovingKey] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

  async function handleRemove(credit: CreditForDisplay) {
    setRemovingKey(creditKey(credit));
    try {
      const formData = new FormData();
      formData.set("groupSlug", groupSlug);
      formData.set("pieceId", pieceId);
      formData.set("personId", credit.personId);
      formData.set("role", credit.role);
      await removeCredit(formData);
      setRemoveError(null);
      router.refresh();
    } catch (err) {
      setRemoveError(getThrownMessage(err, "Kunde inte ta bort medverkande"));
    } finally {
      setRemovingKey(null);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-2 space-y-0">
        <h2 className="text-lg leading-8 font-medium">Medverkande</h2>
      </CardHeader>
      <CardContent className="space-y-3">
        {credits.length === 0 ? (
          <p className="text-sm text-muted-foreground">Inga medverkande tillagda ännu.</p>
        ) : (
          <PieceCreditsList
            credits={credits}
            className="space-y-2"
            renderRoleAction={
              readOnly
                ? undefined
                : (credit) => (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="-mr-1 size-4 rounded-sm"
                      onClick={() => handleRemove(credit)}
                      disabled={removingKey === creditKey(credit)}
                      aria-label={`Ta bort ${credit.person.name} som ${credit.role}`}
                    >
                      <X className="size-3" aria-hidden="true" />
                    </Button>
                  )
            }
          />
        )}

        {removeError ? <p className="text-sm text-destructive">{removeError}</p> : null}

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
