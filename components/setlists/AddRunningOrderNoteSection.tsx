"use client";

import { useId } from "react";

import { appendSetListNote } from "@/app/actions/setlists";
import { EditOnly } from "@/components/EditModeContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RUNNING_ORDER_NOTE_CAPABILITIES } from "@/lib/edit-mode";

/**
 * The Lägg till anteckning form under a Set list's running order. Shown in
 * Edit mode to a Member who may manage Running-order notes. The heading names
 * the textarea, so the form says what it does once.
 */
export function AddRunningOrderNoteSection({ groupSlug, setListId }: { groupSlug: string; setListId: string }) {
  const headingId = useId();
  const helpId = useId();

  return (
    <EditOnly anyOf={RUNNING_ORDER_NOTE_CAPABILITIES}>
      <section className="space-y-3">
        <div className="space-y-1">
          <h2 id={headingId} className="text-lg font-medium">
            Lägg till anteckning
          </h2>
          <p id={helpId} className="text-sm text-muted-foreground">
            En anteckning hör inte till något stycke, till exempel en paus eller en presentation. Den hamnar sist i
            ordningen.
          </p>
        </div>
        <form action={appendSetListNote} className="space-y-3">
          <input type="hidden" name="groupSlug" value={groupSlug} />
          <input type="hidden" name="setListId" value={setListId} />
          <Textarea
            name="content"
            required
            rows={4}
            className="min-h-[6rem]"
            aria-labelledby={headingId}
            aria-describedby={helpId}
          />
          <Button type="submit">Lägg till</Button>
        </form>
      </section>
    </EditOnly>
  );
}
