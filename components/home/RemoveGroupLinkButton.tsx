"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";

import { removeGroupLink } from "@/app/actions/group-links";
import type { GroupLink } from "@/app/actions/groups";
import { Button } from "@/components/ui/button";
import { getThrownMessage } from "@/lib/getThrownMessage";

/** _Ta bort_ on a Group link: removes it at once, as a Piece's Links are. */
export function RemoveGroupLinkButton({ groupSlug, link }: { groupSlug: string; link: GroupLink }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function remove() {
    const formData = new FormData();
    formData.set("groupSlug", groupSlug);
    formData.set("linkId", link.id);
    startTransition(async () => {
      try {
        await removeGroupLink(formData);
        setError(null);
      } catch (err) {
        setError(getThrownMessage(err, "Kunde inte ta bort länken"));
      }
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-label={`Ta bort ${link.label}`}
        disabled={pending}
        onClick={remove}
      >
        <Trash2 aria-hidden="true" />
        Ta bort
      </Button>
      {error ? <p className="w-full text-sm text-destructive">{error}</p> : null}
    </>
  );
}
