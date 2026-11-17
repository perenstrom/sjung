"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { addCredits } from "@/app/actions/pieces";
import { PieceCreditDraftRow } from "@/components/pieces/PieceCreditDraftRow";
import { EMPTY_CREDIT_DRAFT } from "@/lib/pieces/credits";
import type { Person, PieceCredit } from "@/types/piece-credit-dialog";

/** Row that adds a Person with one or more Credit roles to a saved Piece straight away. */
export function AddPieceCreditRow({
  groupSlug,
  pieceId,
  people,
  creditRoles,
  credits,
  onAdded,
}: {
  groupSlug: string;
  pieceId: string;
  people: Person[];
  creditRoles: string[];
  /** The Piece's current Credits, used to lock roles the Person already holds. */
  credits: PieceCredit[];
  /** Called once the Credits are saved. */
  onAdded?: () => void;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(EMPTY_CREDIT_DRAFT);

  // The row only calls this once the draft has a Person and roles.
  async function handleAdd() {
    const formData = new FormData();
    formData.set("groupSlug", groupSlug);
    formData.set("pieceId", pieceId);
    formData.set("personId", draft.personId);
    formData.set("roles", JSON.stringify(draft.roles));
    await addCredits(formData);
    router.refresh();
    onAdded?.();
  }

  return (
    <PieceCreditDraftRow
      groupSlug={groupSlug}
      people={people}
      creditRoles={creditRoles}
      credits={credits}
      draft={draft}
      onDraftChange={setDraft}
      onAdd={handleAdd}
    />
  );
}

