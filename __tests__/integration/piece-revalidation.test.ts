import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import type { Group, Piece } from "@/app/generated/prisma/client";
import { createGroup, createPiece, createSetList, createSetListPiece } from "../support/fixtures";
import { deletePiece, updatePiece } from "@/app/actions/pieces";

const mockAuth = vi.mocked(auth);
const mockRevalidatePath = vi.mocked(revalidatePath);

async function createSetListWithPieces(group: Group, pieces: Piece[]) {
  const setList = await createSetList(group, "Konsert");
  for (const [position, piece] of pieces.entries()) {
    await createSetListPiece(setList, piece, position);
  }
  return setList;
}

function revalidatedPaths(): string[] {
  return mockRevalidatePath.mock.calls.map(([path]) => path);
}

describe("piece mutations revalidate every page that shows the piece", () => {
  let group: Group;
  let piece: Piece;
  let otherPiece: Piece;

  beforeEach(async () => {
    mockRevalidatePath.mockClear();
    group = await createGroup();
    mockAuth.mockResolvedValue({ user: { id: group.createdById } } as never);
    piece = await createPiece({ groupId: group.id, createdById: group.createdById });
    otherPiece = await createPiece({ groupId: group.id, createdById: group.createdById });
  });

  it("renaming a piece refreshes the pieces page, its detail page and each set list containing it", async () => {
    const twice = await createSetListWithPieces(group, [piece, otherPiece, piece]);
    const once = await createSetListWithPieces(group, [piece]);
    const without = await createSetListWithPieces(group, [otherPiece]);

    const formData = new FormData();
    formData.set("groupSlug", group.slug);
    formData.set("pieceId", piece.id);
    formData.set("name", "Nytt namn");
    await updatePiece(formData);

    const paths = revalidatedPaths();
    expect(new Set(paths)).toEqual(
      new Set([
        `/app/${group.slug}/pieces`,
        `/app/${group.slug}/pieces/nytt-namn`,
        `/app/${group.slug}/setlists/${twice.slug}`,
        `/app/${group.slug}/setlists/${once.slug}`,
      ]),
    );
    expect(paths).not.toContain(`/app/${group.slug}/setlists/${without.slug}`);
    expect(paths).not.toContain(`/app/${group.slug}/setlists`);
  });

  it("deleting a piece refreshes the set lists that contained it", async () => {
    const containing = await createSetListWithPieces(group, [piece, otherPiece]);
    const without = await createSetListWithPieces(group, [otherPiece]);

    const formData = new FormData();
    formData.set("groupSlug", group.slug);
    formData.set("pieceId", piece.id);
    await deletePiece(formData);

    const paths = revalidatedPaths();
    expect(paths).toContain(`/app/${group.slug}/pieces`);
    expect(paths).toContain(`/app/${group.slug}/setlists/${containing.slug}`);
    expect(paths).not.toContain(`/app/${group.slug}/setlists/${without.slug}`);
    expect(paths).not.toContain(`/app/${group.slug}/setlists`);
  });
});
