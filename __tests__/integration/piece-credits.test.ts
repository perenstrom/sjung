import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { auth } from "@/auth";
import type { Group, Person } from "@/app/generated/prisma/client";
import { addCredit, createPiece as createPieceAction } from "@/app/actions/pieces";
import { testPrisma } from "../support/db";
import { createGroup, createPerson, createPiece } from "../support/fixtures";
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
    ).rejects.toThrow("Person hittades inte");

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
    ).rejects.toThrow("Person hittades inte");

    expect(await testPrisma.piece.count({ where: { groupId: group.id } })).toBe(0);
    expect(await testPrisma.personToPiece.count()).toBe(0);
  });
});
