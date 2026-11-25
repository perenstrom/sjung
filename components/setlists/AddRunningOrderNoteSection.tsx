"use client";

import { appendSetListNote } from "@/app/actions/setlists";
import { EditOnly } from "@/components/EditModeContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RUNNING_ORDER_NOTE_CAPABILITIES } from "@/lib/edit-mode";

/**
 * The Lägg till anteckning form under a Set list's running order. Shown in
 * Edit mode to a Member who may manage Running-order notes.
 */
export function AddRunningOrderNoteSection({ groupSlug, setListId }: { groupSlug: string; setListId: string }) {
  return (
    <EditOnly anyOf={RUNNING_ORDER_NOTE_CAPABILITIES}>
      <section className="space-y-3">
        <h2 className="text-lg font-medium">Lägg till anteckning</h2>
        <form action={appendSetListNote} className="space-y-3">
          <input type="hidden" name="groupSlug" value={groupSlug} />
          <input type="hidden" name="setListId" value={setListId} />
          <label className="block space-y-2">
            <span className="text-sm font-medium">Lägg till anteckning</span>
            <Textarea name="content" required rows={4} className="min-h-[6rem]" />
          </label>
          <Button type="submit">Lägg till anteckning</Button>
        </form>
      </section>
    </EditOnly>
  );
}
