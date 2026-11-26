import { describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { revalidatePath } from "next/cache";
import type { Group } from "@/app/generated/prisma/client";
import type { GroupClaim } from "@/app/generated/prisma/enums";
import {
  createGroupCoverImageUploadUrl,
  getGroupHome,
  removeGroupCoverImage,
  setGroupCoverImage,
} from "@/app/actions/groups";
import { GET as loadCoverImage } from "@/app/app/[groupSlug]/cover-image/route";
import { testPrisma } from "../support/db";
import { failDeletesOf, putStoredObject, storedKeys } from "../support/fake-object-storage";
import { createAccessScenario, createMember } from "../support/fixtures";
import { formData } from "../support/form-data";
import { actAs } from "../support/session";

const REFUSED = "Du har inte behörighet att ändra gruppens startsida";
const NOT_A_MEMBER = "Ogiltig grupp eller saknad behörighet";

/** Asks for an upload link as the browser would, then puts the object there, as the browser's PUT would. */
async function upload(group: Group, image = { contentType: "image/png", size: 2048 }): Promise<string> {
  const { storagePath } = await createGroupCoverImageUploadUrl(
    formData({ groupSlug: group.slug, contentType: image.contentType, size: String(image.size) }),
  );
  putStoredObject(storagePath, image);
  return storagePath;
}

function save(group: Group, storagePath: string) {
  return setGroupCoverImage(formData({ groupSlug: group.slug, storagePath }));
}

function remove(group: Group) {
  return removeGroupCoverImage(formData({ groupSlug: group.slug }));
}

async function storedCoverImage(group: Group) {
  return testPrisma.group.findUniqueOrThrow({
    where: { id: group.id },
    select: { coverImageKey: true, coverImageContentType: true, updatedById: true, homeUpdatedAt: true },
  });
}

/** Follows Home's image link as the browser would. */
function followImageLink(groupSlug: string) {
  return loadCoverImage(new Request(`http://localhost/app/${groupSlug}/cover-image`), {
    params: Promise.resolve({ groupSlug }),
  });
}

describe("who may change the Cover image", () => {
  it.each<[string, GroupClaim[] | "Creator", boolean]>([
    ["the Creator", "Creator", true],
    ["a MANAGE_GROUP_HOME holder", ["MANAGE_GROUP_HOME"], true],
    ["a MANAGE_CONTENT-only holder", ["MANAGE_CONTENT"], false],
    ["a Member holding no Claim", [], false],
  ])("%s: allowed %s", async (_label, kind, allowed) => {
    const { group, creator } = await createAccessScenario();
    const viewer = kind === "Creator" ? creator : await createMember(group, kind);

    if (allowed) {
      actAs(viewer.id);
      const key = await upload(group);
      await save(group, key);
      expect(await storedCoverImage(group)).toMatchObject({ coverImageKey: key, updatedById: viewer.id });

      const replacement = await upload(group);
      await save(group, replacement);
      expect((await storedCoverImage(group)).coverImageKey).toBe(replacement);

      await remove(group);
      expect((await storedCoverImage(group)).coverImageKey).toBeNull();
      return;
    }

    // Someone allowed puts one there first, so replacing and removing have something to refuse.
    actAs(creator.id);
    const key = await upload(group);
    await save(group, key);
    putStoredObject(`groups/${group.id}/cover-image/someone-elses`, { contentType: "image/png", size: 1024 });

    actAs(viewer.id);
    await expect(
      createGroupCoverImageUploadUrl(formData({ groupSlug: group.slug, contentType: "image/png", size: "1024" })),
    ).rejects.toThrow(REFUSED);
    await expect(save(group, `groups/${group.id}/cover-image/someone-elses`)).rejects.toThrow(REFUSED);
    await expect(remove(group)).rejects.toThrow(REFUSED);
    expect((await storedCoverImage(group)).coverImageKey).toBe(key);
  });

  it("refuses someone outside the Group", async () => {
    const { group, nonMember } = await createAccessScenario();
    actAs(nonMember.id);

    await expect(
      createGroupCoverImageUploadUrl(formData({ groupSlug: group.slug, contentType: "image/png", size: "1024" })),
    ).rejects.toThrow(NOT_A_MEMBER);
    await expect(remove(group)).rejects.toThrow(NOT_A_MEMBER);
  });
});

describe("adding a Cover image", () => {
  it("shows it on Home for every Member and counts as a change to the Group's content", async () => {
    const { group, creator, member } = await createAccessScenario();
    actAs(creator.id);
    expect((await getGroupHome(group.slug)).coverImageHref).toBeNull();
    const before = new Date();

    const key = await upload(group, { contentType: "image/webp", size: 4096 });
    await save(group, key);

    const stored = await storedCoverImage(group);
    expect(stored).toMatchObject({ coverImageKey: key, coverImageContentType: "image/webp", updatedById: creator.id });
    expect(stored.homeUpdatedAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(revalidatePath).toHaveBeenCalledWith(`/app/${group.slug}`);
    expect(key.startsWith(`groups/${group.id}/`)).toBe(true);

    actAs(member.id);
    const home = await getGroupHome(group.slug);
    expect(home.coverImageHref).toMatch(new RegExp(`^/app/${group.slug}/cover-image\\?v=`));
    expect(home.canChange).toBe(false);
  });

  it.each([
    ["a GIF", { contentType: "image/gif", size: 1024 }, "Omslagsbilden måste vara en JPEG-, PNG- eller WebP-bild"],
    [
      "an image over 5 MB",
      { contentType: "image/jpeg", size: 5 * 1024 * 1024 + 1 },
      "Omslagsbilden är för stor (max 5 MB)",
    ],
  ])("refuses to sign an upload of %s", async (_label, image, message) => {
    const { group, creator } = await createAccessScenario();
    actAs(creator.id);

    await expect(
      createGroupCoverImageUploadUrl(
        formData({ groupSlug: group.slug, contentType: image.contentType, size: String(image.size) }),
      ),
    ).rejects.toThrow(message);
  });

  it.each([
    ["a GIF", { contentType: "image/gif", size: 1024 }, "Omslagsbilden måste vara en JPEG-, PNG- eller WebP-bild"],
    [
      "an image over 5 MB",
      { contentType: "image/png", size: 5 * 1024 * 1024 + 1 },
      "Omslagsbilden är för stor (max 5 MB)",
    ],
  ])(
    "checks the stored object, not the browser's word: refuses %s and saves nothing",
    async (_label, stored, message) => {
      const { group, creator } = await createAccessScenario();
      actAs(creator.id);
      // The browser asked for a small PNG but stored something else.
      const key = await upload(group);
      putStoredObject(key, stored);

      await expect(save(group, key)).rejects.toThrow(message);

      expect((await storedCoverImage(group)).coverImageKey).toBeNull();
      expect(storedKeys()).toEqual([]);
    },
  );

  it.each([
    ["outside the Group's Cover image prefix", (group: Group) => `groups/${group.id}/pieces/x/y.png`],
    ["in another Group", () => "groups/other-group/cover-image/x"],
  ])("refuses a key %s", async (_label, keyFor) => {
    const { group, creator } = await createAccessScenario();
    actAs(creator.id);
    const key = keyFor(group);
    putStoredObject(key, { contentType: "image/png", size: 1024 });

    await expect(save(group, key)).rejects.toThrow("Ogiltig filsökväg");
    expect(storedKeys()).toEqual([key]);
  });

  it("refuses a key with nothing stored there", async () => {
    const { group, creator } = await createAccessScenario();
    actAs(creator.id);
    const { storagePath } = await createGroupCoverImageUploadUrl(
      formData({ groupSlug: group.slug, contentType: "image/png", size: "1024" }),
    );

    await expect(save(group, storagePath)).rejects.toThrow("Bilden hittades inte i lagringen");
  });
});

describe("replacing the Cover image", () => {
  it("points the Group at the new object, then deletes the old one", async () => {
    const { group, creator } = await createAccessScenario();
    actAs(creator.id);
    const old = await upload(group);
    await save(group, old);

    const replacement = await upload(group, { contentType: "image/jpeg", size: 3000 });
    await save(group, replacement);

    expect(await storedCoverImage(group)).toMatchObject({
      coverImageKey: replacement,
      coverImageContentType: "image/jpeg",
    });
    expect(storedKeys()).toEqual([replacement]);
  });

  it("still succeeds, and logs, when the old object can't be deleted", async () => {
    const { group, creator } = await createAccessScenario();
    actAs(creator.id);
    const old = await upload(group);
    await save(group, old);
    failDeletesOf(old);
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});

    const replacement = await upload(group);
    await save(group, replacement);

    expect((await storedCoverImage(group)).coverImageKey).toBe(replacement);
    expect(logged).toHaveBeenCalled();
    logged.mockRestore();
  });

  it("refuses the current image's own key and keeps it", async () => {
    const { group, creator } = await createAccessScenario();
    actAs(creator.id);
    const key = await upload(group);
    await save(group, key);

    await expect(save(group, key)).rejects.toThrow("Bilden är redan gruppens omslagsbild");
    expect((await storedCoverImage(group)).coverImageKey).toBe(key);
    expect(storedKeys()).toEqual([key]);
  });
});

describe("removing the Cover image", () => {
  it("clears it, deletes the object, and Home hides it again", async () => {
    const { group, creator } = await createAccessScenario();
    actAs(creator.id);
    const key = await upload(group);
    await save(group, key);
    const { homeUpdatedAt: savedAt } = await storedCoverImage(group);

    await remove(group);

    const stored = await storedCoverImage(group);
    expect(stored).toMatchObject({ coverImageKey: null, coverImageContentType: null, updatedById: creator.id });
    expect(stored.homeUpdatedAt!.getTime()).toBeGreaterThanOrEqual(savedAt!.getTime());
    expect(storedKeys()).toEqual([]);
    expect((await getGroupHome(group.slug)).coverImageHref).toBeNull();
  });

  it("still clears it when the object can't be deleted", async () => {
    const { group, creator } = await createAccessScenario();
    actAs(creator.id);
    const key = await upload(group);
    await save(group, key);
    failDeletesOf(key);
    vi.spyOn(console, "error").mockImplementation(() => {});

    await remove(group);

    expect((await storedCoverImage(group)).coverImageKey).toBeNull();
    vi.restoreAllMocks();
  });
});

describe("loading the Cover image", () => {
  it("sends a Member on to a signed URL for it", async () => {
    const { group, creator, member } = await createAccessScenario();
    actAs(creator.id);
    const key = await upload(group);
    await save(group, key);

    actAs(member.id);
    const response = await followImageLink(group.slug);

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toContain(`fake-storage://get/${key}`);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("is not found for someone outside the Group", async () => {
    const { group, creator, nonMember } = await createAccessScenario();
    actAs(creator.id);
    await save(group, await upload(group));

    actAs(nonMember.id);
    const response = await followImageLink(group.slug);

    expect(response.status).toBe(404);
    expect(response.headers.get("location")).toBeNull();
  });

  it("is not found when the Group has none", async () => {
    const { group, member } = await createAccessScenario();
    actAs(member.id);

    expect((await followImageLink(group.slug)).status).toBe(404);
  });
});
