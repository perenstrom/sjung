import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/actions/announcements", () => ({
  markAnnouncementRead: vi.fn(),
  markAllAnnouncementsRead: vi.fn(),
}));

import { AnnouncementsInbox, type AnnouncementsInboxProps } from "@/components/announcements/AnnouncementsInbox";
import { renderMarkup, textOf } from "@/lib/testing/markup";

const older = {
  id: "a1",
  slug: "2026-10-01-aldre-nyhet",
  title: "Äldre nyhet",
  publishedAt: new Date("2026-10-01T12:00:00Z"),
  read: true,
};
const newer = {
  id: "a2",
  slug: "2026-11-01-nyare-nyhet",
  title: "Nyare nyhet",
  publishedAt: new Date("2026-11-01T12:00:00Z"),
  read: false,
};

function render(props: Partial<AnnouncementsInboxProps>) {
  return renderMarkup(
    createElement(AnnouncementsInbox, {
      announcements: [newer, older],
      selected: null,
      canManage: false,
      ...props,
    }),
  );
}

describe("AnnouncementsInbox", () => {
  it("lists the Announcements with the unread count, and asks to pick one rather than opening any", () => {
    const text = textOf(render({}));

    expect(text).toContain("1 olästa");
    expect(text).toMatch(/Nyare nyhet.*2026-11-01.*Äldre nyhet.*2026-10-01/);
    expect(text).toContain("Välj en nyhet");
    expect(text).toContain("Nyare nyhet, oläst");
    expect(text).not.toContain("Äldre nyhet, oläst");
  });

  it("shows the open Announcement and counts it as read", () => {
    const html = render({
      selected: { id: "a2", title: "Nyare nyhet", body: "Det här är **nytt**.", publishedAt: newer.publishedAt },
    });

    expect(html).toContain("<strong>nytt</strong>");
    expect(textOf(html)).toContain("Allt är läst");
    expect(textOf(html)).not.toContain("oläst");
    expect(html).toMatch(
      /<button[^>]*disabled=""[^>]*aria-label="Markera alla som lästa"|<button[^>]*aria-label="Markera alla som lästa"[^>]*disabled=""/,
    );
  });

  it("shows an empty state when there are no Announcements", () => {
    const text = textOf(render({ announcements: [] }));

    expect(text).toContain("Inga nyheter än");
    expect(text).toContain("Allt är läst");
  });

  it("links to Hantera nyheter only for an Operator", () => {
    expect(render({ canManage: true })).toContain('href="/app/news/manage"');
    expect(render({ canManage: false })).not.toContain('href="/app/news/manage"');
  });
});
