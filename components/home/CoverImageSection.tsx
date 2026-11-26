"use client";

import { useEditMode } from "@/components/EditModeContext";
import { CoverImageFrame } from "@/components/home/CoverImageFrame";
import { CoverImageUploadDialog } from "@/components/home/CoverImageUploadDialog";
import { RemoveCoverImageDialog } from "@/components/home/RemoveCoverImageDialog";
import { GROUP_HOME_CAPABILITIES } from "@/lib/edit-mode";

/**
 * The first thing on Home: the Group's Cover image, the same for every
 * Member, edge to edge: it cancels `<main>`'s padding (app/app/layout.tsx)
 * to reach the header and both sides, and scrolls with parallax. Without one
 * it renders nothing, not even in Edit mode; adding the first one is offered
 * next to _Redigera beskrivning_ instead.
 */
export function CoverImageSection({ groupSlug, href }: { groupSlug: string; href: string | null }) {
  const { isEditing } = useEditMode(GROUP_HOME_CAPABILITIES);

  if (!href) {
    return null;
  }

  return (
    <section aria-label="Omslagsbild" className="space-y-2">
      <CoverImageFrame src={href} parallax className="-mx-4 -mt-4 w-auto md:-mt-8 md:-mr-8 md:-ml-12" />
      {isEditing ? (
        <div className="flex flex-wrap gap-2">
          <CoverImageUploadDialog groupSlug={groupSlug} replacing />
          <RemoveCoverImageDialog groupSlug={groupSlug} />
        </div>
      ) : null}
    </section>
  );
}
