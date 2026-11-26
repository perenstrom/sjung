import { describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { createGroup } from "@/app/actions/groups";
import { testPrisma } from "../support/db";
import { createUser } from "../support/fixtures";
import { formData } from "../support/form-data";
import { actAs } from "../support/session";

describe("createGroup", () => {
  it("creates nothing until the user confirms they are starting a new Group", async () => {
    const user = await createUser();
    actAs(user.id);

    await expect(createGroup(formData({ name: "Kammarkören" }))).rejects.toThrow(
      "Bekräfta att du skapar en ny grupp och blir dess administratör",
    );

    expect(await testPrisma.group.count()).toBe(0);
  });

  it("makes the confirming user the Creator and only Member of the new Group", async () => {
    const user = await createUser();
    actAs(user.id);

    await createGroup(formData({ name: "Kammarkören", confirmed: "on" }));

    const group = await testPrisma.group.findFirstOrThrow({
      select: { name: true, slug: true, createdById: true, users: { select: { userId: true } } },
    });
    expect(group).toEqual({
      name: "Kammarkören",
      slug: "kammarkoren",
      createdById: user.id,
      users: [{ userId: user.id }],
    });
  });
});
