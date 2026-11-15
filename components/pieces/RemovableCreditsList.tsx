"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { removeCredit } from "@/app/actions/pieces";
import {
  PieceCreditsList,
  RemoveCreditRoleButton,
} from "@/components/pieces/PieceCreditsList";
import { getThrownMessage } from "@/lib/getThrownMessage";
import { creditKey, type CreditForDisplay } from "@/lib/pieces/credits";

/**
 * A piece's credits for edit mode: `PieceCreditsList` with an X on each Credit
 * role badge that removes just that credit, then refreshes. Callers render
 * their own empty state.
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
  const [removingKey, setRemovingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRemove(credit: CreditForDisplay) {
    setRemovingKey(creditKey(credit));
    try {
      const formData = new FormData();
      formData.set("groupSlug", groupSlug);
      formData.set("pieceId", pieceId);
      formData.set("personId", credit.personId);
      formData.set("role", credit.role);
      await removeCredit(formData);
      setError(null);
      router.refresh();
    } catch (err) {
      setError(getThrownMessage(err, "Kunde inte ta bort medverkande"));
    } finally {
      setRemovingKey(null);
    }
  }

  return (
    <>
      <PieceCreditsList
        credits={credits}
        className={className}
        renderRoleAction={(credit) => (
          <RemoveCreditRoleButton
            credit={credit}
            onRemove={handleRemove}
            disabled={removingKey === creditKey(credit)}
          />
        )}
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </>
  );
}
