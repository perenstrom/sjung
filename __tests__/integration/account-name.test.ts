import { describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { GroupClaim } from "@/app/generated/prisma/enums";
import { testPrisma } from "../support/db";
import { createGroup, createMember, createUser } from "../support/fixtures";
import { formData } from "../support/form-data";
import { actAs } from "../support/session";
import { changeOwnName } from "@/app/actions/account";
import { listGroupMembers } from "@/app/actions/groups";

function changeNameTo(name: string, extra: Record<string, string> = {}) {
  return changeOwnName(null, formData({ name, ...extra }));
}

async function storedName(userId: string) {
  return (await testPrisma.user.findUniqueOrThrow({ where: { id: userId } })).name;
}

describe("changeOwnName", () => {
  it("saves the trimmed name, stamped as changed by the User", async () => {
    const user = await createUser({ name: "anna@example.com" });
    actAs(user.id);

    const state = await changeNameTo("  Anna Andersson ");

    expect(state).toEqual({ status: "saved" });
    const stored = await testPrisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(stored.name).toBe("Anna Andersson");
    expect(stored.updatedById).toBe(user.id);
  });

  it("keeps the stored name and says why when the new one is blank", async () => {
    const user = await createUser({ name: "Anna" });
    actAs(user.id);

    const state = await changeNameTo("   ");

    expect(state).toEqual({ status: "error", error: "Namn krävs", values: { name: "" } });
    expect(await storedName(user.id)).toBe("Anna");
  });

  it("changes only the signed-in User's name, whatever id the form sends", async () => {
    const user = await createUser({ name: "Anna" });
    const other = await createUser({ name: "Bertil" });
    actAs(user.id);

    await changeNameTo("Hackad", { id: other.id, userId: other.id });

    expect(await storedName(other.id)).toBe("Bertil");
    expect(await storedName(user.id)).toBe("Hackad");
  });

  it("refuses an Unverified user", async () => {
    const user = await createUser({ name: "Anna", emailVerifiedAt: null });
    actAs(user.id);

    await expect(changeNameTo("Anna Andersson")).rejects.toThrow("E-postadressen är inte bekräftad");
    expect(await storedName(user.id)).toBe("Anna");
  });

  it("shows the new name to the other Members of the User's Groups", async () => {
    const group = await createGroup();
    const user = await createMember(group);
    const manager = await createMember(group, [GroupClaim.MANAGE_MEMBERS]);
    actAs(user.id);

    await changeNameTo("Anna Andersson");

    actAs(manager.id);
    const members = await listGroupMembers(group.slug);
    expect(members.find((member) => member.id === user.id)?.name).toBe("Anna Andersson");
  });
});
