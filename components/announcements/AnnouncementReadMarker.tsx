"use client";

import { useEffect } from "react";
import { markAnnouncementRead } from "@/app/actions/announcements";

/**
 * Marks the open Announcement read once it has been shown. The action
 * revalidates the app, so the list and the sidebar dot update without a reload.
 */
export function AnnouncementReadMarker({ id }: { id: string }) {
  useEffect(() => {
    markAnnouncementRead(id).catch((error) => console.error("Kunde inte markera nyheten som läst", error));
  }, [id]);

  return null;
}
