"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { addCredit } from "@/app/actions/pieces";
import { PieceCreditDraftRow } from "@/components/pieces/PieceCreditDraftRow";
import { type CreditForDisplay, EMPTY_CREDIT_DRAFT } from "@/lib/pieces/credits";
import type { Person, PieceCredit } from "@/types/piece-credit-dialog";

/** Always-visible row that adds one Credit to a saved Piece straight away. */
export function AddPieceCreditRow({
  groupSlug,
  pieceId,
  people,
  credits,
}: {
  groupSlug: string;
  pieceId: string;
  people: Person[];
  /** The Piece's current Credits, used to disable roles the Person already holds. */
  credits: PieceCredit[];
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(EMPTY_CREDIT_DRAFT);

  async function handleAdd(credit: CreditForDisplay) {
    const formData = new FormData();
    formData.set("groupSlug", groupSlug);
    formData.set("pieceId", pieceId);
    formData.set("personId", credit.personId);
    formData.set("role", credit.role);
    await addCredit(formData);
    router.refresh();
  }

  return (
    <PieceCreditDraftRow
      groupSlug={groupSlug}
      people={people}
      credits={credits}
      draft={draft}
      onDraftChange={setDraft}
      onAdd={handleAdd}
    />
  );
}
