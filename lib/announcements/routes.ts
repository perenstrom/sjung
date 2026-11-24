/** Every Verified user's Announcements: the list, with nothing open. */
export const ANNOUNCEMENTS_PATH = "/app/news";

/** One Announcement open in the reading pane. Opening it marks it read. */
export function announcementPath({ slug }: { slug: string }): string {
  return `${ANNOUNCEMENTS_PATH}/${slug}`;
}

/** Where Operators publish, edit and delete Announcements. */
export const MANAGE_ANNOUNCEMENTS_PATH = `${ANNOUNCEMENTS_PATH}/manage`;

/** The editor for a new Announcement. */
export const NEW_ANNOUNCEMENT_PATH = `${MANAGE_ANNOUNCEMENTS_PATH}/new`;

/** The editor for an existing Announcement. */
export function editAnnouncementPath({ slug }: { slug: string }): string {
  return `${MANAGE_ANNOUNCEMENTS_PATH}/${slug}`;
}
