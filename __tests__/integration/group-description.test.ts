import { describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import type { GroupClaim } from "@/app/generated/prisma/enums";
import { getGroupDescription, setGroupDescription } from "@/app/actions/groups";
import { GROUP_DESCRIPTION_MAX_LENGTH } from "@/lib/schemas/groups";
import { testPrisma } from "../support/db";
import { createAccessScenario, createMember } from "../support/fixtures";
import { formData } from "../support/form-data";
import { actAs } from "../support/session";

const REFUSED = "Du har inte behörighet att ändra gruppens beskrivning";

function saveDescription(groupSlug: string, description: string) {
  return setGroupDescription(formData({ groupSlug, description }));
}

async function storedDescription(groupId: string) {
  const group = await testPrisma.group.findUniqueOrThrow({ where: { id: groupId }, select: { description: true } });
  return group.description;
}

describe("setGroupDescription", () => {
  it.each<[string, GroupClaim[] | "Creator", boolean]>([
    ["the Creator", "Creator", true],
    ["a MANAGE_GROUP_DESCRIPTION holder", ["MANAGE_GROUP_DESCRIPTION"], true],
    ["a MANAGE_CONTENT-only holder", ["MANAGE_CONTENT"], false],
    ["a Member holding no Claim", [], false],
  ])("lets %s change it: %s", async (_label, kind, allowed) => {
    const { group, creator } = await createAccessScenario();
    const viewer = kind === "Creator" ? creator : await createMember(group, kind);
    actAs(viewer.id);

    expect((await getGroupDescription(group.slug)).canChange).toBe(allowed);
    const saving = saveDescription(group.slug, "  Vi repar **tisdagar**.  ");

    if (allowed) {
      await saving;
      expect(await storedDescription(group.id)).toBe("Vi repar **tisdagar**.");
      // Every Member reads the same description.
      actAs((await createMember(group)).id);
      expect(await getGroupDescription(group.slug)).toEqual({
        description: "Vi repar **tisdagar**.",
        canChange: false,
      });
    } else {
      await expect(saving).rejects.toThrow(REFUSED);
      expect(await storedDescription(group.id)).toBeNull();
    }
  });

  it("refuses someone outside the Group", async () => {
    const { group, nonMember } = await createAccessScenario();
    actAs(nonMember.id);

    await expect(saveDescription(group.slug, "Hej")).rejects.toThrow("Ogiltig grupp eller saknad behörighet");
    await expect(getGroupDescription(group.slug)).rejects.toThrow("Ogiltig grupp eller saknad behörighet");
  });

  it.each(["", "   \n\t "])("clears the description when saved blank (%j)", async (blank) => {
    const { group, creator } = await createAccessScenario();
    actAs(creator.id);
    await saveDescription(group.slug, "Vi repar tisdagar.");

    await saveDescription(group.slug, blank);

    expect(await storedDescription(group.id)).toBeNull();
    expect((await getGroupDescription(group.slug)).description).toBeNull();
  });

  it("rejects text over the limit and keeps what was there", async () => {
    const { group, creator } = await createAccessScenario();
    actAs(creator.id);
    await saveDescription(group.slug, "Vi repar tisdagar.");

    await expect(saveDescription(group.slug, "a".repeat(GROUP_DESCRIPTION_MAX_LENGTH + 1))).rejects.toThrow(
      "Beskrivningen får vara högst 5 000 tecken",
    );
    expect(await storedDescription(group.id)).toBe("Vi repar tisdagar.");

    await saveDescription(group.slug, "a".repeat(GROUP_DESCRIPTION_MAX_LENGTH));
    expect(await storedDescription(group.id)).toHaveLength(GROUP_DESCRIPTION_MAX_LENGTH);
  });
});
