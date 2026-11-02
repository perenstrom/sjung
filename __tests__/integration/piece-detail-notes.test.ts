import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));

import { auth } from "@/auth";
import type { Group, Piece } from "@/app/generated/prisma/client";
import { testPrisma } from "../support/db";
import { createGroup, createPiece, createPieceNote, createUser } from "../support/fixtures";
import { getPieceDetail, listPieceNotes } from "@/app/actions/pieces";

const mockAuth = vi.mocked(auth);

describe("piece detail includes the piece's Piece notes", () => {
  let group: Group;
  let piece: Piece;

  beforeEach(async () => {
    const creator = await createUser({ name: "Bertil Berg" });
    group = await createGroup({ createdById: creator.id });
    mockAuth.mockResolvedValue({ user: { id: group.createdById } } as never);
    piece = await createPiece({ groupId: group.id, createdById: group.createdById });
  });

  it("returns no Piece notes for a piece without any", async () => {
    const detail = await getPieceDetail(group.slug, piece.id);

    expect(detail?.notes).toEqual([]);
  });

  it("returns Piece notes newest-updated first with author name, matching listPieceNotes", async () => {
    const author = await createUser({ name: "Anna Andersson" });
    await testPrisma.usersToGroups.create({ data: { userId: author.id, groupId: group.id } });
    const otherPiece = await createPiece({ groupId: group.id, createdById: group.createdById });

    await createPieceNote({
      piece,
      createdById: author.id,
      content: "Äldst",
      updatedAt: new Date("2026-01-01T10:00:00Z"),
    });
    await createPieceNote({
      piece,
      createdById: group.createdById,
      content: "Nyast\nmed radbrytning",
      updatedAt: new Date("2026-03-01T10:00:00Z"),
    });
    await createPieceNote({ piece: otherPiece, createdById: author.id, content: "Annat stycke" });

    const detail = await getPieceDetail(group.slug, piece.id);

    expect(detail?.notes.map((note) => [note.content, note.createdByName])).toEqual([
      ["Nyast\nmed radbrytning", "Bertil Berg"],
      ["Äldst", "Anna Andersson"],
    ]);
    expect(detail?.notes).toEqual(await listPieceNotes(group.slug, piece.id));
  });
});
