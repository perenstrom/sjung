import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`redirect:${url}`);
  }),
  notFound: vi.fn(() => {
    throw new Error("notFound");
  }),
}));

import type { Group } from "@/app/generated/prisma/client";
import {
  createAnnouncement as publishAnnouncement,
  updateAnnouncement as editAnnouncement,
} from "@/app/actions/announcements";
import { createPieceFileUploadUrl, finalizePieceFileUpload, updatePieceFileDisplayName } from "@/app/actions/files";
import { createPerson, renamePerson } from "@/app/actions/people";
import { createPiece, getPieceImportGroup, importPieces, updatePiece } from "@/app/actions/pieces";
import { createSetList, updateSetList } from "@/app/actions/setlists";
import { buildImportPlan, importOutcome, NO_IMPORT_CHOICES } from "@/lib/pieces/import";
import { testPrisma } from "../support/db";
import { putStoredObject } from "../support/fake-object-storage";
import * as fixtures from "../support/fixtures";
import { formData } from "../support/form-data";
import { createOperator, OPERATOR_EMAIL } from "../support/operators";
import { actAs } from "../support/session";

type Row = { id: string; slug: string };

/** How to add, rename and list one kind of Group content through the app's own actions. */
type Kind = {
  add: (group: Group, name: string) => Promise<unknown>;
  rename: (group: Group, id: string, name: string) => Promise<unknown>;
  /** The Group's rows of this kind, oldest first. */
  rows: (group: Group) => Promise<Row[]>;
};

const OLDEST_FIRST = [{ createdAt: "asc" as const }, { id: "asc" as const }];
const ROW = { id: true, slug: true } as const;

/** The one Piece each Group's Files are uploaded to. */
async function pieceFor(group: Group) {
  const existing = await testPrisma.piece.findFirst({ where: { groupId: group.id, name: "Filbärare" } });
  return existing ?? fixtures.createPiece({ groupId: group.id, createdById: group.createdById, name: "Filbärare" });
}

const KINDS: Record<string, Kind> = {
  Piece: {
    add: (group, name) => createPiece(formData({ groupSlug: group.slug, name })),
    rename: (group, pieceId, name) => updatePiece(formData({ groupSlug: group.slug, pieceId, name })),
    rows: (group) =>
      testPrisma.piece.findMany({
        where: { groupId: group.id, NOT: { name: "Filbärare" } },
        orderBy: OLDEST_FIRST,
        select: ROW,
      }),
  },
  "Set list": {
    add: (group, name) => createSetList(formData({ groupSlug: group.slug, name })),
    rename: (group, setListId, name) => updateSetList(formData({ groupSlug: group.slug, setListId, name })),
    rows: (group) => testPrisma.setList.findMany({ where: { groupId: group.id }, orderBy: OLDEST_FIRST, select: ROW }),
  },
  Person: {
    add: (group, name) => createPerson(formData({ groupSlug: group.slug, name })),
    rename: (group, personId, name) => renamePerson(formData({ groupSlug: group.slug, personId, name })),
    rows: (group) => testPrisma.person.findMany({ where: { groupId: group.id }, orderBy: OLDEST_FIRST, select: ROW }),
  },
  File: {
    add: async (group, displayName) => {
      const piece = await pieceFor(group);
      const fileName = "noter.pdf";
      const { storagePath } = await createPieceFileUploadUrl(
        formData({ groupSlug: group.slug, pieceId: piece.id, fileName, mimeType: "application/pdf", size: "1024" }),
      );
      putStoredObject(storagePath);
      await finalizePieceFileUpload(
        formData({ groupSlug: group.slug, pieceId: piece.id, fileName, storagePath, displayName }),
      );
    },
    rename: (group, fileId, displayName) =>
      updatePieceFileDisplayName(formData({ groupSlug: group.slug, fileId, displayName })),
    rows: (group) =>
      testPrisma.file.findMany({ where: { piece: { groupId: group.id } }, orderBy: OLDEST_FIRST, select: ROW }),
  },
};

let group: Group;

beforeEach(async () => {
  group = await fixtures.createGroup();
  actAs(group.createdById);
});

describe.each(Object.entries(KINDS))("a %s's Slug", (_, kind) => {
  async function slugs(inGroup = group) {
    return (await kind.rows(inGroup)).map((row) => row.slug);
  }

  it("is made from its name", async () => {
    await kind.add(group, "Vår Kör!");

    expect(await slugs()).toEqual(["var-kor"]);
  });

  it("is numbered on a clash within the Group, but not with another Group's", async () => {
    const otherGroup = await fixtures.createGroup({ createdById: group.createdById });
    await kind.add(group, "Ave Maria");
    await kind.add(group, "Ave  Maria!");
    await kind.add(otherGroup, "Ave Maria");

    expect(await slugs()).toEqual(["ave-maria", "ave-maria-2"]);
    expect(await slugs(otherGroup)).toEqual(["ave-maria"]);
  });

  it("stays unique when two with the same name are saved at once", async () => {
    await Promise.all([kind.add(group, "Ave Maria"), kind.add(group, "Ave Maria")]);

    expect((await slugs()).sort()).toEqual(["ave-maria", "ave-maria-2"]);
  });

  it("is made again from the new name on a rename, and kept when the name makes the same Slug", async () => {
    await kind.add(group, "Ave Maria");
    await kind.add(group, "Ave Maria");
    const [, second] = await kind.rows(group);

    await kind.rename(group, second.id, "Ave Maria ");
    expect(await slugs()).toEqual(["ave-maria", "ave-maria-2"]);

    await kind.rename(group, second.id, "Gloria");
    expect(await slugs()).toEqual(["ave-maria", "gloria"]);
  });
});

it("does not clash across kinds in one Group", async () => {
  await KINDS.Piece.add(group, "Ave Maria");
  await KINDS.Person.add(group, "Ave Maria");

  expect((await KINDS.Piece.rows(group)).map((row) => row.slug)).toEqual(["ave-maria"]);
  expect((await KINDS.Person.rows(group)).map((row) => row.slug)).toEqual(["ave-maria"]);
});

it("gives each Piece and new Person in an import its own Slug", async () => {
  await KINDS.Piece.add(group, "Ave Maria");
  const text = ["Titel\tKompositör", "Ave Maria!\tAnna Berg", "Ave Maria?\tAnna-Berg"].join("\n");
  const plan = buildImportPlan(text, await getPieceImportGroup(group.slug), NO_IMPORT_CHOICES);
  if (plan.kind !== "preview") throw new Error(plan.kind);

  await importPieces(
    formData({
      groupSlug: group.slug,
      text,
      choices: JSON.stringify(NO_IMPORT_CHOICES),
      outcome: importOutcome(plan),
    }),
  );

  // An import saves its rows at once, so which row got which is not told by their order.
  expect((await KINDS.Piece.rows(group)).map((row) => row.slug).sort()).toEqual([
    "ave-maria",
    "ave-maria-2",
    "ave-maria-3",
  ]);
  expect((await KINDS.Person.rows(group)).map((row) => row.slug).sort()).toEqual(["anna-berg", "anna-berg-2"]);
});

describe("an Announcement's Slug", () => {
  beforeEach(async () => {
    vi.stubEnv("OPERATORS_EMAIL", OPERATOR_EMAIL);
    actAs((await createOperator()).id);
    vi.useFakeTimers({ toFake: ["Date"] });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  async function publish(title: string) {
    await expect(publishAnnouncement(null, formData({ title, body: "Text" }))).rejects.toThrow("redirect:");
  }

  async function slugs() {
    return (await testPrisma.announcement.findMany({ orderBy: { slug: "asc" }, select: ROW })).map((row) => row.slug);
  }

  it("is the publishing date in Stockholm and the title, numbered on a clash that day", async () => {
    // 00:30 on 24 November in Stockholm.
    vi.setSystemTime(new Date("2026-11-23T23:30:00Z"));
    await publish("Ny spelare");
    await publish("Ny spelare");
    vi.setSystemTime(new Date("2026-11-25T12:00:00Z"));
    await publish("Ny spelare");
    await publish("Manage");

    expect(await slugs()).toEqual([
      "2026-11-24-ny-spelare",
      "2026-11-24-ny-spelare-2",
      "2026-11-25-manage",
      "2026-11-25-ny-spelare",
    ]);
  });

  it("follows an edited title but keeps its publishing date", async () => {
    vi.setSystemTime(new Date("2026-11-23T23:30:00Z"));
    await publish("Ny spelare");
    const [announcement] = await testPrisma.announcement.findMany({ select: ROW });

    vi.setSystemTime(new Date("2026-12-01T12:00:00Z"));
    await expect(
      editAnnouncement(null, formData({ id: announcement.id, title: "Ny version", body: "Text" })),
    ).rejects.toThrow("redirect:");

    expect(await slugs()).toEqual(["2026-11-24-ny-version"]);
  });
});
