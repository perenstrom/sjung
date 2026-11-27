import { describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { revalidatePath } from "next/cache";
import type { Group, User } from "@/app/generated/prisma/client";
import type { GroupClaim } from "@/app/generated/prisma/enums";
import { addGroupLink, removeGroupLink, updateGroupLink } from "@/app/actions/group-links";
import { getGroupHome } from "@/app/actions/groups";
import { testPrisma } from "../support/db";
import { createAccessScenario, createGroup, createGroupLink, createMember } from "../support/fixtures";
import { formData } from "../support/form-data";
import { actAs } from "../support/session";

const REFUSED = "Du har inte behörighet att ändra gruppens startsida";

function add(group: Group, label: string, url: string) {
  return addGroupLink(formData({ groupSlug: group.slug, label, url }));
}

function update(group: Group, linkId: string, label: string, url: string) {
  return updateGroupLink(formData({ groupSlug: group.slug, linkId, label, url }));
}

function remove(group: Group, linkId: string) {
  return removeGroupLink(formData({ groupSlug: group.slug, linkId }));
}

async function storedLinks(group: Group) {
  return testPrisma.groupLink.findMany({
    where: { groupId: group.id },
    select: { label: true, url: true },
    orderBy: { createdAt: "asc" },
  });
}

async function homeUpdatedAt(group: Group) {
  const { homeUpdatedAt } = await testPrisma.group.findUniqueOrThrow({ where: { id: group.id } });
  return homeUpdatedAt;
}

/** Each action, run by the current viewer against a Group that already has one link. */
const ACTIONS: [string, (group: Group, linkId: string) => Promise<unknown>][] = [
  ["addGroupLink", (group) => add(group, "Instagram", "https://instagram.com/kor")],
  ["updateGroupLink", (group, linkId) => update(group, linkId, "Ny kalender", "https://example.se")],
  ["removeGroupLink", (group, linkId) => remove(group, linkId)],
];

describe.each(ACTIONS)("%s", (_name, run) => {
  it.each<[string, GroupClaim[] | "Creator", boolean]>([
    ["the Creator", "Creator", true],
    ["a MANAGE_GROUP_HOME holder", ["MANAGE_GROUP_HOME"], true],
    ["a MANAGE_CONTENT-only holder", ["MANAGE_CONTENT"], false],
    ["a Member holding no Claim", [], false],
  ])("lets %s change the links: %s", async (_label, kind, allowed) => {
    const { group, creator } = await createAccessScenario();
    const link = await createGroupLink(group);
    const viewer: User = kind === "Creator" ? creator : await createMember(group, kind);
    actAs(viewer.id);
    const before = await storedLinks(group);

    if (allowed) {
      await run(group, link.id);
      expect(await storedLinks(group)).not.toEqual(before);
    } else {
      await expect(run(group, link.id)).rejects.toThrow(REFUSED);
      expect(await storedLinks(group)).toEqual(before);
    }
  });

  it("refuses someone outside the Group", async () => {
    const { group, nonMember } = await createAccessScenario();
    const link = await createGroupLink(group);
    actAs(nonMember.id);

    await expect(run(group, link.id)).rejects.toThrow("Ogiltig grupp eller saknad behörighet");
  });

  it("counts as a change to Home's content", async () => {
    const { group, creator } = await createAccessScenario();
    const link = await createGroupLink(group);
    actAs(creator.id);
    const before = new Date();

    await run(group, link.id);

    expect((await homeUpdatedAt(group))!.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(revalidatePath).toHaveBeenCalledWith(`/app/${group.slug}`);
  });
});

describe.each([
  ["updateGroupLink", (group: Group, linkId: string) => update(group, linkId, "Kapad", "https://example.se")],
  ["removeGroupLink", (group: Group, linkId: string) => remove(group, linkId)],
])("%s on another Group's link", (_name, run) => {
  it("refuses it as not found and leaves it as it was", async () => {
    const { group, creator } = await createAccessScenario();
    const other = await createGroup();
    const theirs = await createGroupLink(other, "Deras kalender", "https://deras.se");
    actAs(creator.id);

    await expect(run(group, theirs.id)).rejects.toThrow("Länk hittades inte");
    expect(await storedLinks(other)).toEqual([{ label: "Deras kalender", url: "https://deras.se" }]);
  });
});

describe("Group links on Home", () => {
  it("are added, edited and removed, and every Member reads them sorted by label", async () => {
    const { group, creator, member } = await createAccessScenario();
    actAs(creator.id);

    await add(group, "  Swish  ", "  www.swish.nu  ");
    await add(group, "Kalender", "https://calendar.google.com");
    await add(group, "Facebook", "https://facebook.com/groups/kor");
    const [swish] = await testPrisma.groupLink.findMany({ where: { label: "Swish" } });
    await update(group, swish!.id, "Betalning", "https://swish.nu/betala");
    const facebook = (await getGroupHome(group.slug)).links.find((link) => link.label === "Facebook")!;
    await remove(group, facebook.id);

    actAs(member.id);
    expect((await getGroupHome(group.slug)).links.map(({ label, url }) => ({ label, url }))).toEqual([
      { label: "Betalning", url: "https://swish.nu/betala" },
      { label: "Kalender", url: "https://calendar.google.com" },
    ]);
  });

  it("rejects invalid input from the add and edit forms and keeps what was there", async () => {
    const { group, creator } = await createAccessScenario();
    const link = await createGroupLink(group, "Kalender", "https://example.com");
    actAs(creator.id);

    await expect(add(group, "", "https://example.se")).rejects.toThrow("Namn krävs");
    await expect(update(group, link.id, "Kalender", "ftp://example.se")).rejects.toThrow(
      "Adressen måste börja med http eller https",
    );
    expect(await storedLinks(group)).toEqual([{ label: "Kalender", url: "https://example.com" }]);
  });
});
