"use client";

import type { GroupLink } from "@/app/actions/groups";
import { useEditMode } from "@/components/EditModeContext";
import { GroupLinkDialog } from "@/components/home/GroupLinkDialog";
import { RemoveGroupLinkButton } from "@/components/home/RemoveGroupLinkButton";
import { GROUP_HOME_CAPABILITIES } from "@/lib/edit-mode";
import { groupLinkHost } from "@/lib/groups/group-links";

/** Whether {@link GroupLinksSection} shows: with links, or in Edit mode for a Member who can add one. */
export function showsGroupLinks(links: readonly GroupLink[], isEditing: boolean): boolean {
  return links.length > 0 || isEditing;
}

/**
 * Home's _Länkar_: the Group links, in the order given, each with its host
 * beneath, the same for every Member. Without any it renders nothing, except
 * in Edit mode, where a Member who can change them gets a way to add the first.
 */
export function GroupLinksSection({ groupSlug, links }: { groupSlug: string; links: GroupLink[] }) {
  const { isEditing } = useEditMode(GROUP_HOME_CAPABILITIES);

  if (!showsGroupLinks(links, isEditing)) {
    return null;
  }

  return (
    <section aria-labelledby="group-links-heading" className="min-w-0 space-y-2">
      <h2 id="group-links-heading" className="text-lg font-medium">
        Länkar
      </h2>
      {links.length > 0 ? (
        <ul className="list-disc space-y-2 pl-5 marker:text-muted-foreground">
          {links.map((link) => (
            <li key={link.id} className="leading-snug">
              <a href={link.url} target="_blank" rel="noreferrer" className="break-words underline underline-offset-4">
                {link.label}
              </a>
              <span className="block truncate text-sm text-muted-foreground">{groupLinkHost(link.url)}</span>
              {isEditing ? (
                <div className="mt-1 flex flex-wrap gap-2">
                  <GroupLinkDialog groupSlug={groupSlug} link={link} />
                  <RemoveGroupLinkButton groupSlug={groupSlug} link={link} />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {isEditing ? <GroupLinkDialog groupSlug={groupSlug} /> : null}
    </section>
  );
}
