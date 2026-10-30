import { describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { auth } from "@/auth";
import { testPrisma } from "../support/db";
import { createGroup, createPiece } from "../support/fixtures";
import { deleteGroup } from "@/app/actions/groups";

const mockAuth = vi.mocked(auth);

describe("deleteGroup", () => {
  it("deletes a group's Person even though it still has a people_to_pieces credit row", async () => {
    // The credited Piece lives in a different Group, so cascading through
    // this Group's own Pieces can't incidentally clear the credit first —
    // this is what actually exercises PersonToPiece.person's onDelete
    // behavior (PER-280) rather than relying on cascade ordering luck.
    const group = await createGroup();
    const person = await testPrisma.person.create({
      data: {
        name: "Test Composer",
        groupId: group.id,
        createdById: group.createdById,
        updatedById: group.createdById,
      },
    });
    const piece = await createPiece();
    await testPrisma.personToPiece.create({
      data: {
        personId: person.id,
        pieceId: piece.id,
        role: "composer",
      },
    });

    mockAuth.mockResolvedValue({
      user: { id: group.createdById },
    } as never);

    const formData = new FormData();
    formData.set("id", group.id);

    await deleteGroup(formData);

    expect(await testPrisma.group.findUnique({ where: { id: group.id } })).toBeNull();
    expect(await testPrisma.person.findUnique({ where: { id: person.id } })).toBeNull();
    expect(
      await testPrisma.personToPiece.findUnique({
        where: { personId_pieceId_role: { personId: person.id, pieceId: piece.id, role: "composer" } },
      })
    ).toBeNull();
    // The piece's own group was untouched by this deletion.
    expect(await testPrisma.piece.findUnique({ where: { id: piece.id } })).not.toBeNull();
  });
});
