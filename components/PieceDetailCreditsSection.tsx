"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { removeCredit } from "@/app/actions/pieces";
import { useEditMode } from "@/components/EditModeContext";
import { AddPieceCreditRow } from "@/components/pieces/AddPieceCreditRow";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getThrownMessage } from "@/lib/getThrownMessage";
import { sortCreditsForDisplay } from "@/lib/pieces/credits";
import type { Person, PieceCredit } from "@/types/piece-credit-dialog";

type PieceDetailCredit = PieceCredit & { person: { name: string } };

type PieceDetailCreditsSectionProps = {
  groupSlug: string;
  pieceId: string;
  pieceName: string;
  credits: PieceDetailCredit[];
  people: Person[];
};

function creditKey(credit: PieceDetailCredit): string {
  return `${credit.personId}::${credit.role}`;
}

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

  const sortedCredits = sortCreditsForDisplay(credits);

  async function handleRemove(credit: PieceDetailCredit) {
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
        {sortedCredits.length === 0 ? (
          <p className="text-sm text-muted-foreground">Inga medverkande tillagda ännu.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {sortedCredits.map((credit) => (
              <li key={creditKey(credit)} className="flex min-h-7 items-center gap-2">
                <span className="font-medium">{credit.person.name}</span>
                <span className="inline-flex items-center rounded-md border border-input bg-muted/50 px-2 py-0.5 text-xs text-muted-foreground">
                  {credit.role}
                </span>
                {readOnly ? null : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7 shrink-0"
                    onClick={() => handleRemove(credit)}
                    disabled={removingKey === creditKey(credit)}
                    aria-label={`Ta bort ${credit.person.name} som ${credit.role}`}
                  >
                    <Trash2 className="size-3.5" aria-hidden="true" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
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
