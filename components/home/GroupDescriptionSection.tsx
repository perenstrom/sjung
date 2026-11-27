"use client";

import { useEditMode } from "@/components/EditModeContext";
import { CollapsibleGroupDescription } from "@/components/home/CollapsibleGroupDescription";
import { CoverImageUploadDialog } from "@/components/home/CoverImageUploadDialog";
import { EditGroupDescriptionDialog } from "@/components/home/EditGroupDescriptionDialog";
import { GROUP_HOME_CAPABILITIES } from "@/lib/edit-mode";

/** Whether {@link GroupDescriptionSection} shows: with a description, or in Edit mode for a Member who can write one. */
export function showsGroupDescription(description: string | null, isEditing: boolean): boolean {
  return Boolean(description) || isEditing;
}

/**
 * The top of Home: the Group description, with no heading of its own, the
 * same for every Member. Without one it renders nothing, except in Edit mode,
 * where a Member who can change it gets a way to write the first one, and to
 * add a Cover image while the Group has none.
 */
export function GroupDescriptionSection({
  groupSlug,
  description,
  hasCoverImage,
}: {
  groupSlug: string;
  description: string | null;
  hasCoverImage: boolean;
}) {
  const { isEditing } = useEditMode(GROUP_HOME_CAPABILITIES);

  if (!showsGroupDescription(description, isEditing)) {
    return null;
  }

  return (
    <section aria-label="Beskrivning" className="space-y-2">
      {description ? (
        <CollapsibleGroupDescription description={description} />
      ) : (
        <p className="text-sm text-muted-foreground">Ingen beskrivning än</p>
      )}
      {isEditing ? (
        <div className="flex flex-wrap gap-2">
          <EditGroupDescriptionDialog groupSlug={groupSlug} description={description} />
          {hasCoverImage ? null : <CoverImageUploadDialog groupSlug={groupSlug} />}
        </div>
      ) : null}
    </section>
  );
}
