"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { removePersonCredits } from "@/app/actions/pieces";
import {
  PieceCreditsList,
  RemoveCreditedPersonButton,
} from "@/components/pieces/PieceCreditsList";
import { getThrownMessage } from "@/lib/getThrownMessage";
import type { CreditedPerson, CreditForDisplay } from "@/lib/pieces/credits";

/**
 * A saved piece's credits for edit mode: `PieceCreditsList` with a bin on
 * each Person's row that removes all their Credits, then refreshes. Callers
 * render their own empty state.
 */
export function RemovableCreditsList({
  groupSlug,
  pieceId,
  credits,
  className,
}: {
  groupSlug: string;
  pieceId: string;
  credits: CreditForDisplay[];
  className?: string;
}) {
  const router = useRouter();
  const [removingPersonId, setRemovingPersonId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRemove(person: CreditedPerson) {
    setRemovingPersonId(person.personId);
    try {
      const formData = new FormData();
      formData.set("groupSlug", groupSlug);
      formData.set("pieceId", pieceId);
      formData.set("personId", person.personId);
      await removePersonCredits(formData);
      setError(null);
      router.refresh();
    } catch (err) {
      setError(getThrownMessage(err, "Kunde inte ta bort upphovspersonen från stycket"));
    } finally {
      setRemovingPersonId(null);
    }
  }

  return (
    <>
      <PieceCreditsList
        credits={credits}
        className={className}
        renderPersonAction={(person) => (
          <RemoveCreditedPersonButton
            person={person}
            onRemove={handleRemove}
            disabled={removingPersonId === person.personId}
          />
        )}
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </>
  );
}
