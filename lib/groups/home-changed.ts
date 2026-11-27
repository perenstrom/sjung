/**
 * The Group fields to write with any change to Home's own content (the Group
 * description, Cover image or Group links): when it last changed, for the
 * Group overview's "last changed", and by whom.
 */
export function homeChangedBy(userId: string) {
  return { homeUpdatedAt: new Date(), updatedById: userId };
}
