import { notFound } from "next/navigation";

import type { SluggedKind } from "@/lib/content-slug";
import { findBySegmentInGroup, type SegmentMatch } from "@/lib/find-in-group";
import { requireTenantGroup } from "@/lib/tenant-group";

/**
 * The content a page's URL segment names in the Group, by Slug or by id, for
 * a Member of the Group; not found otherwise. When the match's `slug` isn't
 * the segment, the page redirects permanently to its Slug URL (ADR-0011).
 */
export async function findPageContent(groupSlug: string, kind: SluggedKind, segment: string): Promise<SegmentMatch> {
  const { groupId } = await requireTenantGroup(groupSlug);
  const match = await findBySegmentInGroup(groupId, kind, segment);
  if (!match) {
    notFound();
  }
  return match;
}
