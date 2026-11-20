import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`redirect:${url}`);
  }),
  notFound: vi.fn(() => {
    throw new Error("notFound");
  }),
}));

import type { User } from "@/app/generated/prisma/client";
import { testPrisma } from "../support/db";
import { createAnnouncement, createGroup, createMember, createUser } from "../support/fixtures";
import { formData } from "../support/form-data";
import { createOperator, OPERATOR_EMAIL } from "../support/operators";
import { actAs } from "../support/session";
import {
  createAnnouncement as publishAnnouncement,
  deleteAnnouncement,
  getAnnouncement,
  getAnnouncementsInbox,
  getAnnouncementsToManage,
  getAnnouncementToEdit,
  markAllAnnouncementsRead,
  markAnnouncementRead,
  updateAnnouncement,
} from "@/app/actions/announcements";
import { hasUnreadAnnouncements } from "@/lib/announcements/announcements";
import { MANAGE_ANNOUNCEMENTS_PATH } from "@/lib/announcements/routes";

beforeEach(() => {
  vi.stubEnv("OPERATORS_EMAIL", `someone-else@sjung.test, ${OPERATOR_EMAIL.toUpperCase()}`);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

/** A time `minutes` after the User's account was created. */
function after(user: User, minutes: number): Date {
  return new Date(user.createdAt.getTime() + minutes * 60_000);
}

/** Which Announcements the User sees in the list, by title, and whether each is read. */
async function inboxOf(user: User) {
  actAs(user.id);
  const { announcements } = await getAnnouncementsInbox();
  return announcements.map(({ title, read }) => ({ title, read }));
}

describe("Operator gating", () => {
  it.each([
    // Actions are forbidden; pages are not found.
    ["publishing", "Forbidden", () => publishAnnouncement(null, formData({ title: "Ny", body: "Text" }))],
    ["editing", "Forbidden", (id: string) => updateAnnouncement(null, formData({ id, title: "Ändrad", body: "Ändrad" }))],
    ["deleting", "Forbidden", (id: string) => deleteAnnouncement(formData({ id }))],
    ["listing for management", "notFound", () => getAnnouncementsToManage()],
    ["opening the editor", "notFound", (id: string) => getAnnouncementToEdit(id)],
  ])("rejects a User who isn't an Operator from %s, changing nothing", async (_label, error, call) => {
    const announcement = await createAnnouncement({ title: "Orörd", body: "Orörd" });
    const user = await createUser({ email: "member@sjung.test" });
    actAs(user.id);

    await expect(call(announcement.id)).rejects.toThrow(error);

    const rows = await testPrisma.announcement.findMany({ select: { title: true, body: true } });
    expect(rows).toEqual([{ title: "Orörd", body: "Orörd" }]);
  });

  it("makes nobody an Operator when OPERATORS_EMAIL is missing", async () => {
    vi.stubEnv("OPERATORS_EMAIL", "");
    const operator = await createOperator();
    actAs(operator.id);

    await expect(getAnnouncementsToManage()).rejects.toThrow("notFound");
    expect((await getAnnouncementsInbox()).canManage).toBe(false);
  });
});

describe("publishing", () => {
  it("publishes a new Announcement at once to every Verified user, whatever their Groups", async () => {
    const operator = await createOperator();
    const reader = await createMember(await createGroup());
    const loner = await createUser();
    actAs(operator.id);

    await expect(
      publishAnnouncement(null, formData({ title: "  Nytt i Sjung  ", body: "  Nu finns **nyheter**.  " }))
    ).rejects.toThrow(`redirect:${MANAGE_ANNOUNCEMENTS_PATH}`);

    const [row] = await testPrisma.announcement.findMany();
    expect(row).toMatchObject({ title: "Nytt i Sjung", body: "Nu finns **nyheter**.", createdById: operator.id });
    for (const user of [reader, loner]) {
      expect(await inboxOf(user)).toEqual([{ title: "Nytt i Sjung", read: false }]);
      expect(await hasUnreadAnnouncements(user)).toBe(true);
    }
    // The author has already read what they wrote.
    expect(await inboxOf(operator)).toEqual([{ title: "Nytt i Sjung", read: true }]);
  });

  it.each([
    ["a blank title", { title: "  ", body: "Text" }, "Skriv en rubrik"],
    ["a blank body", { title: "Rubrik", body: "  " }, "Skriv en text"],
    ["a title over 200 characters", { title: "a".repeat(201), body: "Text" }, "Rubriken får vara högst 200 tecken"],
  ])("rejects %s without publishing, keeping what was typed", async (_label, values, error) => {
    const operator = await createOperator();
    actAs(operator.id);

    await expect(publishAnnouncement(null, formData(values))).resolves.toEqual({
      error,
      values: { title: values.title.trim(), body: values.body.trim() },
    });
    expect(await testPrisma.announcement.count()).toBe(0);
  });

  it("edits an Announcement without making it unread for those who have read it", async () => {
    const operator = await createOperator();
    const reader = await createUser();
    const announcement = await createAnnouncement({ title: "Före", publishedAt: after(reader, 1) });
    actAs(reader.id);
    await markAnnouncementRead(announcement.id);

    actAs(operator.id);
    await expect(
      updateAnnouncement(null, formData({ id: announcement.id, title: "Efter", body: "Ny text" }))
    ).rejects.toThrow(`redirect:${MANAGE_ANNOUNCEMENTS_PATH}`);

    expect(await inboxOf(reader)).toEqual([{ title: "Efter", read: true }]);
    const row = await testPrisma.announcement.findUniqueOrThrow({ where: { id: announcement.id } });
    expect(row).toMatchObject({ body: "Ny text", publishedAt: announcement.publishedAt, updatedById: operator.id });
  });

  it("answers with an error, keeping what was typed, when the edited Announcement was deleted meanwhile", async () => {
    const operator = await createOperator();
    actAs(operator.id);

    await expect(
      updateAnnouncement(null, formData({ id: "00000000-0000-0000-0000-000000000000", title: "Efter", body: "Text" }))
    ).resolves.toEqual({ error: "Nyheten finns inte längre", values: { title: "Efter", body: "Text" } });
  });

  it("deletes an Announcement for everyone, along with its read state", async () => {
    const operator = await createOperator();
    const reader = await createUser();
    const announcement = await createAnnouncement({ publishedAt: after(reader, 1) });
    actAs(reader.id);
    await markAnnouncementRead(announcement.id);

    actAs(operator.id);
    await deleteAnnouncement(formData({ id: announcement.id }));

    expect(await testPrisma.announcement.count()).toBe(0);
    expect(await testPrisma.announcementRead.count()).toBe(0);
    expect(await inboxOf(reader)).toEqual([]);
  });

  it("lists every Announcement, newest first, for the Operator to manage", async () => {
    const operator = await createOperator();
    await createAnnouncement({ title: "Äldst", publishedAt: new Date("2026-01-01") });
    await createAnnouncement({ title: "Nyast", publishedAt: new Date("2026-03-01") });
    actAs(operator.id);

    expect((await getAnnouncementsToManage()).map(({ title }) => title)).toEqual(["Nyast", "Äldst"]);
    expect((await getAnnouncementsInbox()).canManage).toBe(true);
  });
});

describe("reading", () => {
  it("lists Announcements newest first and never marks anything read by listing", async () => {
    const reader = await createUser();
    await createAnnouncement({ title: "Första", publishedAt: after(reader, 1) });
    await createAnnouncement({ title: "Andra", publishedAt: after(reader, 2) });

    expect(await inboxOf(reader)).toEqual([
      { title: "Andra", read: false },
      { title: "Första", read: false },
    ]);
    expect(await inboxOf(reader)).toEqual([
      { title: "Andra", read: false },
      { title: "Första", read: false },
    ]);
    expect((await getAnnouncementsInbox()).unreadCount).toBe(2);
  });

  it("marks an opened Announcement read for that User only", async () => {
    const reader = await createUser();
    const other = await createUser();
    const first = await createAnnouncement({ title: "Första", publishedAt: after(other, 1) });
    const second = await createAnnouncement({ title: "Andra", publishedAt: after(other, 2) });
    actAs(reader.id);

    expect(await getAnnouncement(first.id)).toMatchObject({ title: "Första", body: first.body });
    await markAnnouncementRead(first.id);
    await markAnnouncementRead(first.id);

    expect(await inboxOf(reader)).toEqual([
      { title: "Andra", read: false },
      { title: "Första", read: true },
    ]);
    expect(await hasUnreadAnnouncements(reader)).toBe(true);
    expect(await inboxOf(other)).toEqual([
      { title: "Andra", read: false },
      { title: "Första", read: false },
    ]);

    actAs(reader.id);
    await markAnnouncementRead(second.id);
    expect(await hasUnreadAnnouncements(reader)).toBe(false);
  });

  it("marks every Announcement read for that User only", async () => {
    const reader = await createUser();
    const other = await createUser();
    await createAnnouncement({ title: "Första", publishedAt: after(other, 1) });
    await createAnnouncement({ title: "Andra", publishedAt: after(other, 2) });
    actAs(reader.id);

    await markAllAnnouncementsRead();

    expect((await getAnnouncementsInbox()).unreadCount).toBe(0);
    expect(await hasUnreadAnnouncements(reader)).toBe(false);
    expect(await hasUnreadAnnouncements(other)).toBe(true);
  });

  it("counts Announcements published before the account was created as read, without storing it", async () => {
    const before = await createAnnouncement({ title: "Före", publishedAt: new Date("2020-01-01") });
    const reader = await createUser();
    await createAnnouncement({ title: "Efter", publishedAt: after(reader, 1) });
    actAs(reader.id);

    expect(await inboxOf(reader)).toEqual([
      { title: "Efter", read: false },
      { title: "Före", read: true },
    ]);
    await markAnnouncementRead(before.id);
    await markAllAnnouncementsRead();

    expect(await hasUnreadAnnouncements(reader)).toBe(false);
    const rows = await testPrisma.announcementRead.findMany({ select: { announcement: { select: { title: true } } } });
    expect(rows).toEqual([{ announcement: { title: "Efter" } }]);
  });

  it("answers null for an Announcement that doesn't exist", async () => {
    const reader = await createUser();
    actAs(reader.id);

    expect(await getAnnouncement("00000000-0000-0000-0000-000000000000")).toBeNull();
    await expect(markAnnouncementRead("00000000-0000-0000-0000-000000000000")).resolves.toBeUndefined();
  });

  it("refuses an Unverified user", async () => {
    const user = await createUser({ emailVerifiedAt: null });
    actAs(user.id);

    await expect(getAnnouncementsInbox()).rejects.toThrow("E-postadressen är inte bekräftad");
    await expect(markAllAnnouncementsRead()).rejects.toThrow("E-postadressen är inte bekräftad");
  });
});
