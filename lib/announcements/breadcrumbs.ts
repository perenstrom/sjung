import type { AppBreadcrumbAncestor, AppBreadcrumbStaticTrail } from "@/lib/breadcrumbs";
import { ANNOUNCEMENTS_PATH, MANAGE_ANNOUNCEMENTS_PATH } from "@/lib/announcements/routes";

const announcementsAncestor = { label: "Nyheter", href: ANNOUNCEMENTS_PATH };
const manageAncestor = { label: "Hantera nyheter", href: MANAGE_ANNOUNCEMENTS_PATH };

function trail(ancestors: AppBreadcrumbAncestor[], label: string): AppBreadcrumbStaticTrail {
  return { visibility: "visible", ancestors, tail: { kind: "static", label } };
}

/** Nyheter, or Nyheter › <title> with an Announcement open. */
export function announcementsTrail(openTitle: string | null): AppBreadcrumbStaticTrail {
  return openTitle === null ? trail([], "Nyheter") : trail([announcementsAncestor], openTitle);
}

/** Nyheter › Hantera nyheter, or › <editor label> below it. */
export function manageAnnouncementsTrail(editorLabel: string | null): AppBreadcrumbStaticTrail {
  return editorLabel === null
    ? trail([announcementsAncestor], "Hantera nyheter")
    : trail([announcementsAncestor, manageAncestor], editorLabel);
}
