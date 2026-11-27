"use client";

import type { GroupLink } from "@/app/actions/groups";
import { useEditMode } from "@/components/EditModeContext";
import { GroupDescriptionSection, showsGroupDescription } from "@/components/home/GroupDescriptionSection";
import { GroupLinksSection, showsGroupLinks } from "@/components/home/GroupLinksSection";
import { GROUP_HOME_CAPABILITIES } from "@/lib/edit-mode";
import { cn } from "@/lib/utils";

/**
 * The Group description and the Group links. Laid out by the width of Home's
 * own column, not the viewport, so an open or collapsed sidebar counts: from
 * 48rem, with both showing, the links sit in a fixed 18rem column to the
 * right; otherwise they stack below, and either one alone spans the column.
 */
export function GroupDescriptionAndLinks({
  groupSlug,
  description,
  hasCoverImage,
  links,
}: {
  groupSlug: string;
  description: string | null;
  hasCoverImage: boolean;
  links: GroupLink[];
}) {
  const { isEditing } = useEditMode(GROUP_HOME_CAPABILITIES);
  // Each section shows in Edit mode even when empty, so it holds its place.
  const showsDescription = showsGroupDescription(description, isEditing);
  const showsLinks = showsGroupLinks(links, isEditing);
  if (!showsDescription && !showsLinks) {
    return null;
  }
  const sideBySide = showsDescription && showsLinks;

  return (
    <div className="@container">
      <div className={cn("grid gap-4 md:gap-6", sideBySide && "@3xl:grid-cols-[minmax(0,1fr)_18rem] @3xl:gap-10")}>
        {showsDescription ? (
          <div className="min-w-0">
            <GroupDescriptionSection groupSlug={groupSlug} description={description} hasCoverImage={hasCoverImage} />
          </div>
        ) : null}
        <GroupLinksSection groupSlug={groupSlug} links={links} />
      </div>
    </div>
  );
}
