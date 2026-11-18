import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));
vi.mock("node:crypto", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:crypto")>();
  return { ...actual, randomUUID: vi.fn(actual.randomUUID) };
});

import type { Group } from "@/app/generated/prisma/client";
import { getPieceImportGroup, importPieces } from "@/app/actions/pieces";
import { buildImportPlan, importOutcome, NO_IMPORT_CHOICES, type ImportChoices } from "@/lib/pieces/import";
import { testPrisma } from "../support/db";
import { createCredit, createGroup, createPerson, createPiece } from "../support/fixtures";
import { formData } from "../support/form-data";
import { actAs } from "../support/session";

/** The outcome the user previewed: the paste matched against the Group as it is now. */
async function previewedOutcome(group: Group, text: string, choices: ImportChoices) {
  const plan = buildImportPlan(text, await getPieceImportGroup(group.slug), choices);
  if (plan.kind !== "preview") throw new Error(plan.kind);
  return importOutcome(plan);
}

async function confirm(group: Group, text: string, choices: ImportChoices = NO_IMPORT_CHOICES, outcome?: string) {
  return importPieces(
    formData({
      groupSlug: group.slug,
      text,
      choices: JSON.stringify(choices),
      outcome: outcome ?? (await previewedOutcome(group, text, choices)),
    })
  );
}

/** Every Piece in the Group as `title: Name (role, role)`, by title. */
async function piecesInGroup(group: Group): Promise<string[]> {
  const pieces = await testPrisma.piece.findMany({
    where: { groupId: group.id },
    orderBy: { name: "asc" },
    include: { credits: { include: { person: true }, orderBy: [{ person: { name: "asc" } }, { role: "asc" }] } },
  });
  return pieces.map((piece) => {
    const people = new Map<string, string[]>();
    for (const credit of piece.credits) people.set(credit.person.name, [...(people.get(credit.person.name) ?? []), credit.role]);
    const credits = [...people].map(([name, roles]) => `${name} (${roles.join(", ")})`).join(" · ");
    return credits ? `${piece.name}: ${credits}` : piece.name;
  });
}

const peopleInGroup = async (group: Group) =>
  (await testPrisma.person.findMany({ where: { groupId: group.id }, orderBy: { name: "asc" } })).map((p) => p.name);

describe("importPieces", () => {
  let group: Group;

  beforeEach(async () => {
    group = await createGroup();
    actAs(group.createdById);
  });

  it("adds every Piece, new Person and Credit in one go", async () => {
    const rows = Array.from({ length: 100 }, (_, i) => `Stycke ${String(i).padStart(3, "0")}\tTonsättare ${i % 10}`);

    const result = await confirm(group, ["Titel\tKompositör", ...rows].join("\n"));

    expect(result).toEqual({
      kind: "imported",
      summary: { pieces: 100, skipped: 0, newPeople: 10, newCreditRoles: ["Kompositör"] },
    });
    expect(await testPrisma.piece.count({ where: { groupId: group.id } })).toBe(100);
    expect(await peopleInGroup(group)).toHaveLength(10);
    expect(await testPrisma.personToPiece.count({ where: { piece: { groupId: group.id } } })).toBe(100);
  });

  it("reuses the Group's People and Credit roles, and skips duplicate titles unless chosen", async () => {
    const benny = await createPerson(group, "Benny Andersson");
    await createCredit(await createPiece({ groupId: group.id, createdById: group.createdById, name: "Mamma Mia" }), benny, "Låtskrivare");
    const text = [
      "Titel\tlåtskrivare\tTextförfattare\tÅr",
      "Thank you for the music\tbenny andersson\tBjörn Ulvaeus\t1977",
      "mamma mia\tBenny Andersson\t\t1975",
      "Chess\t\t\t1984",
      "Chess\tTim Rice\t\t",
    ].join("\n");

    const result = await confirm(group, text, { ...NO_IMPORT_CHOICES, addDuplicateLines: [5] });

    expect(result).toEqual({
      kind: "imported",
      summary: { pieces: 3, skipped: 1, newPeople: 2, newCreditRoles: ["Textförfattare"] },
    });
    expect(await piecesInGroup(group)).toEqual([
      "Chess",
      "Chess: Tim Rice (Låtskrivare)",
      "Mamma Mia: Benny Andersson (Låtskrivare)",
      "Thank you for the music: Benny Andersson (Låtskrivare) · Björn Ulvaeus (Textförfattare)",
    ]);
    expect(await peopleInGroup(group)).toEqual(["Benny Andersson", "Björn Ulvaeus", "Tim Rice"]);
  });

  it("saves nothing and returns the Group as it is now when it changed since the preview", async () => {
    const text = "Titel\tKompositör\nKyrie\tMozart\nGloria\tVivaldi";
    const outcome = await previewedOutcome(group, text, NO_IMPORT_CHOICES);
    const mozart = await createPerson(group, "Mozart");

    const result = await confirm(group, text, NO_IMPORT_CHOICES, outcome);

    expect(result).toEqual({
      kind: "changed",
      group: { people: [{ id: mozart.id, name: "Mozart" }], creditRoles: [], pieceTitles: [] },
    });
    expect(await testPrisma.piece.count({ where: { groupId: group.id } })).toBe(0);
    expect(await peopleInGroup(group)).toEqual(["Mozart"]);
  });

  it("leaves no Piece, Person or Credit behind when saving fails part-way", async () => {
    const taken = await createPiece({ groupId: group.id, createdById: group.createdById, name: "Befintlig" });
    const text = "Titel\tKompositör\nKyrie\tMozart\nGloria\tVivaldi";
    const outcome = await previewedOutcome(group, text, NO_IMPORT_CHOICES);
    // Gloria, the second new Piece, gets a stored Piece's id, so saving fails after the new People are written.
    const takenId = taken.id as ReturnType<typeof randomUUID>;
    vi.mocked(randomUUID).mockReturnValueOnce(randomUUID()).mockReturnValueOnce(takenId);

    await expect(confirm(group, text, NO_IMPORT_CHOICES, outcome)).rejects.toThrow();

    expect(await piecesInGroup(group)).toEqual(["Befintlig"]);
    expect(await peopleInGroup(group)).toEqual([]);
  });

  it("refuses an import with nothing to add", async () => {
    await createPiece({ groupId: group.id, createdById: group.createdById, name: "Kyrie" });

    await expect(confirm(group, "Titel\nKyrie")).rejects.toThrow("Det finns inga noter att importera");
  });

  it("refuses more than 500 rows and writes nothing", async () => {
    const text = ["Titel", ...Array.from({ length: 501 }, (_, i) => `S${i}`)].join("\n");

    await expect(confirm(group, text, NO_IMPORT_CHOICES, "")).rejects.toThrow("Högst 500 rader");

    expect(await testPrisma.piece.count({ where: { groupId: group.id } })).toBe(0);
  });
});
