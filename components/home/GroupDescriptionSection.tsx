"use client";

import { useEditMode } from "@/components/EditModeContext";
import { CollapsibleGroupDescription } from "@/components/home/CollapsibleGroupDescription";
import { EditGroupDescriptionDialog } from "@/components/home/EditGroupDescriptionDialog";
import { GROUP_HOME_CAPABILITIES } from "@/lib/edit-mode";

/**
 * The top of Home: the Group description, with no heading of its own, the
 * same for every Member. Without one it renders nothing, except in Edit mode,
 * where a Member who can change it gets a way to write the first one.
 */
export function GroupDescriptionSection({ groupSlug, description }: { groupSlug: string; description: string | null }) {
  const { isEditing } = useEditMode(GROUP_HOME_CAPABILITIES);

  if (!description && !isEditing) {
    return null;
  }

  return (
    <section aria-label="Beskrivning" className="space-y-2">
      {description ? (
        <CollapsibleGroupDescription description={description} />
      ) : (
        <p className="text-sm text-muted-foreground">Ingen beskrivning än</p>
      )}
      {isEditing ? <EditGroupDescriptionDialog groupSlug={groupSlug} description={description} /> : null}
    </section>
  );
}
