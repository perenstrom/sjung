import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { auth } from "@/auth";
import type { Group, Person } from "@/app/generated/prisma/client";
import {
  addCredit,
  createPiece as createPieceAction,
  getCreditRoles,
  removeCredit,
} from "@/app/actions/pieces";
import { DUPLICATE_CREDITS_ERROR } from "@/lib/pieces/credits";
import { testPrisma } from "../support/db";
import { createCredit, createGroup, createPerson, createPiece } from "../support/fixtures";
import { formData } from "../support/form-data";

const mockAuth = vi.mocked(auth);

describe("Credits only name People in the Piece's Group", () => {
  let group: Group;
  let ownPerson: Person;
  let otherGroupsPerson: Person;

  beforeEach(async () => {
    group = await createGroup();
    mockAuth.mockResolvedValue({ user: { id: group.createdById } } as never);
    ownPerson = await createPerson(group, "Hugo Alfvén");
    otherGroupsPerson = await createPerson(await createGroup(), "Wilhelm Stenhammar");
  });

  it("addCredit credits a Person in the Group", async () => {
    const piece = await createPiece({ groupId: group.id, createdById: group.createdById });

    await addCredit(
      formData({ groupSlug: group.slug, pieceId: piece.id, personId: ownPerson.id, role: "Kompositör" })
    );

    expect(await testPrisma.personToPiece.count({ where: { pieceId: piece.id } })).toBe(1);
  });

  it("addCredit refuses a Person from another Group and writes nothing", async () => {
    const piece = await createPiece({ groupId: group.id, createdById: group.createdById });

    await expect(
      addCredit(
        formData({
          groupSlug: group.slug,
          pieceId: piece.id,
          personId: otherGroupsPerson.id,
          role: "Kompositör",
        })
      )
    ).rejects.toThrow("Upphovsperson hittades inte");

    expect(await testPrisma.personToPiece.count({ where: { pieceId: piece.id } })).toBe(0);
  });

  it("createPiece refuses a Person from another Group and writes nothing", async () => {
    await expect(
      createPieceAction(
        formData({
          groupSlug: group.slug,
          name: "Midsommarvaka",
          credits: JSON.stringify([
            { personId: ownPerson.id, role: "Kompositör" },
            { personId: otherGroupsPerson.id, role: "Arrangör" },
          ]),
        })
      )
    ).rejects.toThrow("Upphovsperson hittades inte");

    expect(await testPrisma.piece.count({ where: { groupId: group.id } })).toBe(0);
    expect(await testPrisma.personToPiece.count()).toBe(0);
  });
});

describe("Credit roles are free text, stored in the spelling the Group already uses", () => {
  let group: Group;
  let person: Person;

  beforeEach(async () => {
    group = await createGroup();
    mockAuth.mockResolvedValue({ user: { id: group.createdById } } as never);
    person = await createPerson(group, "Hugo Alfvén");
    // "Dirigent" is used in this Group; "Ljudtekniker" only in another one.
    const usedOn = await createPiece({ groupId: group.id, createdById: group.createdById });
    await createCredit(usedOn, person, "Dirigent");
    const otherGroup = await createGroup();
    await createCredit(
      await createPiece({ groupId: otherGroup.id, createdById: otherGroup.createdById }),
      await createPerson(otherGroup),
      "Ljudtekniker"
    );
  });

  const storedRoles = async (pieceId: string) =>
    (await testPrisma.personToPiece.findMany({ where: { pieceId }, select: { role: true } })).map(
      (credit) => credit.role
    );

  it.each([
    ["a new role", "Körledare", "Körledare"],
    ["a built-in role in another case and spacing", "  kompositör ", "Kompositör"],
    ["a role the Group uses, in another case", "dirigent", "Dirigent"],
    ["a role only another Group uses", "ljudtekniker", "ljudtekniker"],
  ])("addCredit stores %s as %j", async (_case, typed, stored) => {
    const piece = await createPiece({ groupId: group.id, createdById: group.createdById });

    await addCredit(formData({ groupSlug: group.slug, pieceId: piece.id, personId: person.id, role: typed }));

    expect(await storedRoles(piece.id)).toEqual([stored]);
  });

  it("createPiece stores each role in the Group's spelling", async () => {
    await createPieceAction(
      formData({
        groupSlug: group.slug,
        name: "Midsommarvaka",
        credits: JSON.stringify([
          { personId: person.id, role: " DIRIGENT" },
          { personId: person.id, role: "Körledare" },
        ]),
      })
    );

    const piece = await testPrisma.piece.findFirstOrThrow({ where: { name: "Midsommarvaka" } });
    expect((await storedRoles(piece.id)).sort()).toEqual(["Dirigent", "Körledare"]);
  });

  it("createPiece refuses two roles for one Person that are the same once matched", async () => {
    await expect(
      createPieceAction(
        formData({
          groupSlug: group.slug,
          name: "Midsommarvaka",
          credits: JSON.stringify([
            { personId: person.id, role: "Kompositör" },
            { personId: person.id, role: "kompositör " },
          ]),
        })
      )
    ).rejects.toThrow(DUPLICATE_CREDITS_ERROR);

    expect(await testPrisma.piece.count({ where: { name: "Midsommarvaka" } })).toBe(0);
  });

  it("removeCredit removes a Credit with a custom role", async () => {
    const piece = await createPiece({ groupId: group.id, createdById: group.createdById });
    await createCredit(piece, person, "Körledare");

    await removeCredit(
      formData({ groupSlug: group.slug, pieceId: piece.id, personId: person.id, role: "Körledare" })
    );

    expect(await storedRoles(piece.id)).toEqual([]);
  });

  it("getCreditRoles suggests the built-in roles, then the Group's own, never another Group's", async () => {
    expect(await getCreditRoles(group.slug)).toEqual([
      "Arrangör",
      "Kompositör",
      "Textförfattare",
      "Dirigent",
    ]);
  });
});
