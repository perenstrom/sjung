import { describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { auth } from "@/auth";
import type { Group } from "@/app/generated/prisma/client";
import {
  createAccessScenario,
  createCredit,
  createGroup,
  createMember,
  createPerson as createPersonRow,
  createPiece,
} from "../support/fixtures";
import { actAs } from "../support/session";
import { createPerson, getPeopleWithPieceCounts, getPersonDetail } from "@/app/actions/people";

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

const MISSING_ID = "00000000-0000-0000-0000-000000000000";

function pieceIn(group: Group, name: string) {
  return createPiece({ groupId: group.id, createdById: group.createdById, name });
}

describe("getPersonDetail", () => {
  it("shows a plain Member each Piece the Person is credited on once, with their roles", async () => {
    const group = await createGroup();
    const person = await createPersonRow(group, "Hugo Alfvén");
    const ave = await pieceIn(group, "Ave Maria");
    await createCredit(ave, person, "Textförfattare");
    await createCredit(ave, person, "Arrangör");
    await createCredit(await pieceIn(group, "Kyrie"), await createPersonRow(group, "Någon annan"), "Kompositör");
    actAs((await createMember(group, [])).id);

    expect(await getPersonDetail(group.slug, person.id)).toEqual({
      id: person.id,
      name: "Hugo Alfvén",
      pieces: [{ pieceId: ave.id, name: "Ave Maria", roles: ["Arrangör", "Textförfattare"] }],
    });
  });

  it.each([
    ["in another Group", async () => (await createPersonRow(await createGroup())).id],
    ["missing", async () => MISSING_ID],
  ])("finds no Person %s", async (_where, personId) => {
    const group = await createGroup();
    actAs(group.createdById);

    expect(await getPersonDetail(group.slug, await personId())).toBeNull();
  });
});

describe("getPeopleWithPieceCounts", () => {
  it("counts the distinct Pieces each Person is credited on, including none", async () => {
    const group = await createGroup();
    const hugo = await createPersonRow(group, "Hugo Alfvén");
    await createPersonRow(group, "Anna Utan");
    const ave = await pieceIn(group, "Ave Maria");
    await createCredit(ave, hugo, "Kompositör");
    await createCredit(ave, hugo, "Arrangör");
    await createCredit(await pieceIn(group, "Kyrie"), hugo, "Kompositör");
    actAs((await createMember(group, [])).id);

    expect(
      (await getPeopleWithPieceCounts(group.slug)).map(({ name, pieceCount }) => ({ name, pieceCount }))
    ).toEqual([
      { name: "Anna Utan", pieceCount: 0 },
      { name: "Hugo Alfvén", pieceCount: 2 },
    ]);
  });
});
