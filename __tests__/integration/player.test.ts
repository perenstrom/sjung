import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));

import type { Group, Piece } from "@/app/generated/prisma/client";
import { getPlayerData } from "@/lib/pieces/player";
import { createFile, createGroup, createMember, createPiece, createUser } from "../support/fixtures";
import { actAs } from "../support/session";

let group: Group;
let piece: Piece;

beforeEach(async () => {
  group = await createGroup();
  piece = await createPiece({ groupId: group.id, createdById: group.createdById, name: "Vem kan segla" });
  actAs((await createMember(group)).id);
});

function audioFile(onPiece: Piece, displayName: string, category: string | null = null) {
  return createFile(onPiece, category, { displayName, fileName: `${displayName}.mp3`, mimeType: "audio/mpeg" });
}

describe("opening the player", () => {
  it("opens a Playable File for any Member, without the right to manage content", async () => {
    const file = await audioFile(piece, "Sopran");

    const player = await getPlayerData(group.slug, piece.id, file.id);

    expect(player).toMatchObject({
      pieceName: "Vem kan segla",
      file: { id: file.id, displayName: "Sopran", format: { engine: "audio", label: "MP3" } },
    });
    expect(player?.file.src).toContain(file.storagePath);
  });

  it("offers the Piece's other Playable Files in the order the Piece lists them, and no other Files", async () => {
    const sopran = await audioFile(piece, "Sopran", "Övningsfiler");
    const alt = await audioFile(piece, "Alt", "Övningsfiler");
    const inspelning = await audioFile(piece, "Konsert", "Inspelningar");
    const utan = await audioFile(piece, "Bas");
    await createFile(piece, "Noter", { displayName: "Noter", fileName: "noter.pdf" });
    await audioFile(await createPiece({ groupId: group.id, createdById: group.createdById }), "Tenor");

    const player = await getPlayerData(group.slug, piece.id, sopran.id);

    expect(player?.files).toEqual([
      { id: alt.id, displayName: "Alt", formatLabel: "MP3" },
      { id: sopran.id, displayName: "Sopran", formatLabel: "MP3" },
      { id: inspelning.id, displayName: "Konsert", formatLabel: "MP3" },
      { id: utan.id, displayName: "Bas", formatLabel: "MP3" },
    ]);
  });

  it.each([
    {
      case: "someone outside the Group",
      open: async () => {
        const file = await audioFile(piece, "Sopran");
        actAs((await createUser()).id);
        return getPlayerData(group.slug, piece.id, file.id);
      },
    },
    {
      case: "a File that is not playable",
      open: async () => getPlayerData(group.slug, piece.id, (await createFile(piece)).id),
    },
    {
      case: "a File on another Piece",
      open: async () => {
        const other = await createPiece({ groupId: group.id, createdById: group.createdById });
        return getPlayerData(group.slug, piece.id, (await audioFile(other, "Sopran")).id);
      },
    },
    {
      case: "another Group's Piece and File",
      open: async () => {
        const otherGroup = await createGroup();
        const other = await createPiece({ groupId: otherGroup.id, createdById: otherGroup.createdById });
        return getPlayerData(group.slug, other.id, (await audioFile(other, "Sopran")).id);
      },
    },
  ])("finds nothing for $case", async ({ open }) => {
    expect(await open()).toBeNull();
  });
});
