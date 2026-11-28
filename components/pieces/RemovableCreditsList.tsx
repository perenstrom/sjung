"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { removeCredit, removePersonCredits } from "@/app/actions/pieces";
import {
  PieceCreditsList,
  RemoveCreditedPersonButton,
  RemoveCreditRoleButton,
} from "@/components/pieces/PieceCreditsList";
import { getThrownMessage } from "@/lib/getThrownMessage";
import type { CreditedPerson, CreditForDisplay } from "@/lib/pieces/credits";

/**
 * A saved piece's credits for edit mode: `PieceCreditsList` with a bin on
 * each Person's row that removes all their Credits, and a ✕ on each Credit
 * role badge that removes just that Credit, each then refreshing. Callers
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
  // The Person whose row has a removal running; their bin and ✕s wait for it.
  const [removingPersonId, setRemovingPersonId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runRemoval(
    person: CreditedPerson,
    fields: Record<string, string>,
    action: (formData: FormData) => Promise<void>,
    fallbackError: string,
  ) {
    setRemovingPersonId(person.personId);
    try {
      const formData = new FormData();
      formData.set("groupSlug", groupSlug);
      formData.set("pieceId", pieceId);
      formData.set("personId", person.personId);
      for (const [name, value] of Object.entries(fields)) {
        formData.set(name, value);
      }
      await action(formData);
      setError(null);
      router.refresh();
    } catch (err) {
      setError(getThrownMessage(err, fallbackError));
    } finally {
      setRemovingPersonId(null);
    }
  }

  function handleRemovePerson(person: CreditedPerson) {
    return runRemoval(person, {}, removePersonCredits, "Kunde inte ta bort upphovspersonen från stycket");
  }

  function handleRemoveRole(person: CreditedPerson, role: string) {
    return runRemoval(person, { role }, removeCredit, "Kunde inte ta bort rollen från stycket");
  }

  return (
    <>
      <PieceCreditsList
        credits={credits}
        className={className}
        renderRoleAction={(person, role) => (
          <RemoveCreditRoleButton
            person={person}
            role={role}
            onRemove={handleRemoveRole}
            disabled={removingPersonId === person.personId}
          />
        )}
        renderPersonAction={(person) => (
          <RemoveCreditedPersonButton
            person={person}
            onRemove={handleRemovePerson}
            disabled={removingPersonId === person.personId}
          />
        )}
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </>
  );
}
