import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import type { Group, Piece } from "@/app/generated/prisma/client";
import { addPieceAlias, deletePiece, getPieceDetail, removePieceAlias } from "@/app/actions/pieces";
import { testPrisma } from "../support/db";
import { createGroup, createPiece, createPieceAlias } from "../support/fixtures";
import { formData } from "../support/form-data";
import { actAs } from "../support/session";

describe("Aliases on a Piece", () => {
  let group: Group;
  let piece: Piece;

  const add = (name: string, pieceId = piece.id) =>
    addPieceAlias(formData({ groupSlug: group.slug, pieceId, name }));
  const aliasNames = async (pieceId = piece.id) =>
    (await getPieceDetail(group.slug, pieceId))?.aliases.map((alias) => alias.name);

  beforeEach(async () => {
    group = await createGroup();
    actAs(group.createdById);
    piece = await createPiece({ groupId: group.id, createdById: group.createdById, name: "O helga natt" });
  });

  it("keeps added Aliases, trimmed, in the order they were added", async () => {
    await add("  Julsången ");
    await add("Den långa");
    await add("Cantique de Noël");

    expect(await aliasNames()).toEqual(["Julsången", "Den långa", "Cantique de Noël"]);
  });

  it("refuses a blank Alias", async () => {
    await expect(add("   ")).rejects.toThrow("Namn krävs");

    expect(await aliasNames()).toEqual([]);
  });

  it.each([
    ["an existing Alias", "julsÅngen"],
    ["an existing Alias, spaced differently", " Julsången  "],
    ["the Piece's own name", "o  HELGA natt"],
  ])("quietly ignores %s", async (_, name) => {
    await add("Julsången");

    await add(name);

    expect(await aliasNames()).toEqual(["Julsången"]);
  });

  it("lets two Pieces in the Group share an Alias", async () => {
    const other = await createPiece({ groupId: group.id, createdById: group.createdById, name: "Stilla natt" });

    await add("Julsången");
    await add("Julsången", other.id);

    expect(await aliasNames(other.id)).toEqual(["Julsången"]);
  });

  it("removes one Alias and keeps the rest", async () => {
    await add("Julsången");
    const denLanga = await createPieceAlias(piece, "Den långa");

    await removePieceAlias(formData({ groupSlug: group.slug, pieceAliasId: denLanga.id }));

    expect(await aliasNames()).toEqual(["Julsången"]);
  });

  it("deletes a Piece's Aliases with the Piece", async () => {
    await add("Julsången");

    await deletePiece(formData({ groupSlug: group.slug, pieceId: piece.id }));

    expect(await testPrisma.pieceAlias.count({ where: { pieceId: piece.id } })).toBe(0);
  });
});
