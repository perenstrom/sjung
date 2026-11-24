import { describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`redirect:${url}`);
  }),
}));

import { auth } from "@/auth";
import type { Group } from "@/app/generated/prisma/client";
import { GroupClaim } from "@/app/generated/prisma/enums";
import {
  createAccessScenario,
  createCredit,
  createGroup,
  createMember,
  createPerson as createPersonRow,
  createPiece,
} from "../support/fixtures";
import { actAs } from "../support/session";
import {
  createPerson,
  deletePerson,
  getPeopleWithPieceCounts,
  getPersonDetail,
  renamePerson,
} from "@/app/actions/people";
import { testPrisma } from "../support/db";
import { formData } from "../support/form-data";

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

    const person = await createPerson(personFormData({ groupSlug: group.slug, name: "  Hugo Alfvén " }));

    expect(person).toEqual({ id: expect.any(String), name: "Hugo Alfvén" });
  });

  it("denies a user outside the group", async () => {
    const { group, nonMember } = await createAccessScenario();
    mockAuth.mockResolvedValue({ user: { id: nonMember.id } } as never);

    await expect(createPerson(personFormData({ groupSlug: group.slug, name: "Hugo Alfvén" }))).rejects.toThrow(
      "Ogiltig grupp eller saknad behörighet",
    );
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

    expect((await getPeopleWithPieceCounts(group.slug)).map(({ name, pieceCount }) => ({ name, pieceCount }))).toEqual([
      { name: "Anna Utan", pieceCount: 0 },
      { name: "Hugo Alfvén", pieceCount: 2 },
    ]);
  });
});

describe("renamePerson", () => {
  it("renames the Person to the trimmed name, so every Credit shows it", async () => {
    const group = await createGroup();
    const person = await createPersonRow(group, "Hugo Alfven");
    const ave = await pieceIn(group, "Ave Maria");
    await createCredit(ave, person, "Kompositör");
    const editor = await createMember(group, [GroupClaim.MANAGE_CONTENT]);
    actAs(editor.id);

    await renamePerson(formData({ groupSlug: group.slug, personId: person.id, name: "  Hugo Alfvén " }));

    expect(await testPrisma.person.findUniqueOrThrow({ where: { id: person.id } })).toMatchObject({
      name: "Hugo Alfvén",
      updatedById: editor.id,
    });
    expect(
      await testPrisma.personToPiece.findMany({
        where: { pieceId: ave.id },
        select: { person: { select: { name: true } } },
      }),
    ).toEqual([{ person: { name: "Hugo Alfvén" } }]);
  });

  it("rejects an empty name with the same message as on create", async () => {
    const group = await createGroup();
    const person = await createPersonRow(group, "Hugo Alfvén");
    actAs(group.createdById);

    await expect(renamePerson(formData({ groupSlug: group.slug, personId: person.id, name: "   " }))).rejects.toThrow(
      "Namn krävs",
    );
  });
});

describe("deletePerson", () => {
  it("removes the Person and all of their Credits, then goes to Upphovspersoner", async () => {
    const group = await createGroup();
    const hugo = await createPersonRow(group, "Hugo Alfvén");
    const anna = await createPersonRow(group, "Anna Åström");
    const ave = await pieceIn(group, "Ave Maria");
    await createCredit(ave, hugo, "Kompositör");
    await createCredit(ave, hugo, "Arrangör");
    await createCredit(ave, anna, "Textförfattare");
    actAs(group.createdById);

    await expect(deletePerson(formData({ groupSlug: group.slug, personId: hugo.id }))).rejects.toThrow(
      `redirect:/app/${group.slug}/people`,
    );

    expect(await testPrisma.person.findMany({ where: { groupId: group.id }, select: { id: true } })).toEqual([
      { id: anna.id },
    ]);
    expect(await testPrisma.personToPiece.findMany({ where: { pieceId: ave.id }, select: { personId: true } })).toEqual(
      [{ personId: anna.id }],
    );
  });
});

describe("renamePerson and deletePerson", () => {
  it.each([
    [
      "renamePerson",
      (groupSlug: string, personId: string) => renamePerson(formData({ groupSlug, personId, name: "Någon annan" })),
    ],
    ["deletePerson", (groupSlug: string, personId: string) => deletePerson(formData({ groupSlug, personId }))],
  ])("%s refuses a Person in another Group and changes nothing", async (_name, act) => {
    const group = await createGroup();
    const other = await createGroup();
    const person = await createPersonRow(other, "Hugo Alfvén");
    await createCredit(await pieceIn(other, "Ave Maria"), person, "Kompositör");
    actAs(group.createdById);

    await expect(act(group.slug, person.id)).rejects.toThrow("Upphovsperson hittades inte");

    expect(await testPrisma.person.findUniqueOrThrow({ where: { id: person.id } })).toMatchObject({
      name: "Hugo Alfvén",
    });
    expect(await testPrisma.personToPiece.count({ where: { personId: person.id } })).toBe(1);
  });
});
