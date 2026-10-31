import { describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { auth } from "@/auth";
import { createAccessScenario, createGroup } from "../support/fixtures";
import { createPerson } from "@/app/actions/people";

const mockAuth = vi.mocked(auth);

function personFormData(values: { groupSlug: string; name: string }): FormData {
  const formData = new FormData();
  formData.set("groupSlug", values.groupSlug);
  formData.set("name", values.name);
  return formData;
}

describe("createPerson", () => {
  it("returns the created person with its trimmed name", async () => {
    const group = await createGroup();
    mockAuth.mockResolvedValue({ user: { id: group.createdById } } as never);

    const person = await createPerson(
      personFormData({ groupSlug: group.slug, name: "  Hugo Alfvén " })
    );

    expect(person).toEqual({ id: expect.any(String), name: "Hugo Alfvén" });
  });

  it("denies a user outside the group", async () => {
    const { group, nonMember } = await createAccessScenario();
    mockAuth.mockResolvedValue({ user: { id: nonMember.id } } as never);

    await expect(
      createPerson(personFormData({ groupSlug: group.slug, name: "Hugo Alfvén" }))
    ).rejects.toThrow("Ogiltig grupp eller saknad behörighet");
  });
});
