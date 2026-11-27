import { describe, expect, it } from "vitest";

import type { Group } from "@/app/generated/prisma/client";
import type { SluggedKind } from "@/lib/content-slug";
import { findAnnouncementBySegment, findBySegmentInGroup, findInGroup, type ContentKind } from "@/lib/find-in-group";
import {
  createAnnouncement,
  createFile,
  createGroup,
  createGroupLink,
  createLink,
  createPerson,
  createPiece,
  createPieceAlias,
  createPieceNote,
  createSetList,
  createSetListNote,
  createSetListPiece,
} from "../support/fixtures";

const MISSING_ID = "00000000-0000-0000-0000-000000000000";

async function pieceIn(group: Group) {
  return createPiece({ groupId: group.id, createdById: group.createdById });
}

/** How to make one row of each kind in a Group, and what a refusal says. */
const KINDS: Record<ContentKind, { create: (group: Group) => Promise<{ id: string }>; notFound: string }> = {
  piece: { create: pieceIn, notFound: "Stycke hittades inte" },
  setList: { create: (group) => createSetList(group), notFound: "Repertoar hittades inte" },
  setListPiece: {
    create: async (group) => createSetListPiece(await createSetList(group), await pieceIn(group)),
    notFound: "Repertoarpost hittades inte",
  },
  setListNote: {
    create: async (group) => createSetListNote(await createSetList(group)),
    notFound: "Anteckning hittades inte",
  },
  file: { create: async (group) => createFile(await pieceIn(group)), notFound: "Fil hittades inte" },
  link: { create: async (group) => createLink(await pieceIn(group)), notFound: "Länk hittades inte" },
  pieceAlias: {
    create: async (group) => createPieceAlias(await pieceIn(group)),
    notFound: "Alternativt namn hittades inte",
  },
  pieceNote: {
    create: async (group) => createPieceNote({ piece: await pieceIn(group), createdById: group.createdById }),
    notFound: "Anteckning hittades inte",
  },
  person: { create: (group) => createPerson(group), notFound: "Upphovsperson hittades inte" },
  groupLink: { create: (group) => createGroupLink(group), notFound: "Länk hittades inte" },
};

describe.each(Object.entries(KINDS) as [ContentKind, (typeof KINDS)[ContentKind]][])(
  "findInGroup(%s)",
  (kind, { create, notFound }) => {
    it("returns the row when it is in the Group", async () => {
      const group = await createGroup();
      const row = await create(group);

      await expect(findInGroup(group.id, kind, row.id)).resolves.toEqual({ id: row.id });
    });

    it("refuses a row in another Group", async () => {
      const group = await createGroup();
      const row = await create(await createGroup());

      await expect(findInGroup(group.id, kind, row.id)).rejects.toThrow(notFound);
    });

    it("refuses a missing row", async () => {
      const group = await createGroup();

      await expect(findInGroup(group.id, kind, MISSING_ID)).rejects.toThrow(notFound);
    });
  },
);

describe("findInGroup with a select", () => {
  it("returns the selected fields", async () => {
    const group = await createGroup();
    const piece = await pieceIn(group);
    const file = await createFile(piece);

    const found = await findInGroup(group.id, "file", file.id, {
      select: { pieceId: true, storagePath: true },
    });

    expect(found).toEqual({ pieceId: piece.id, storagePath: file.storagePath });
  });
});

describe.each(["piece", "setList", "person", "file"] as const satisfies readonly SluggedKind[])(
  "findBySegmentInGroup(%s)",
  (kind) => {
    const create = KINDS[kind].create as (group: Group) => Promise<{ id: string; slug: string }>;

    it("finds the row by its Slug", async () => {
      const group = await createGroup();
      const row = await create(group);

      await expect(findBySegmentInGroup(group.id, kind, row.slug)).resolves.toEqual({ id: row.id, slug: row.slug });
    });

    it("finds the row by its id, with the Slug its URL now has", async () => {
      const group = await createGroup();
      const row = await create(group);

      await expect(findBySegmentInGroup(group.id, kind, row.id)).resolves.toEqual({ id: row.id, slug: row.slug });
    });

    it("misses a Slug no row has, such as one from before a rename", async () => {
      const group = await createGroup();
      const row = await create(group);

      await expect(findBySegmentInGroup(group.id, kind, `${row.slug}-forr`)).resolves.toBeNull();
      await expect(findBySegmentInGroup(group.id, kind, MISSING_ID)).resolves.toBeNull();
    });

    it("misses another Group's row by Slug or by id", async () => {
      const group = await createGroup();
      const row = await create(await createGroup());

      await expect(findBySegmentInGroup(group.id, kind, row.slug)).resolves.toBeNull();
      await expect(findBySegmentInGroup(group.id, kind, row.id)).resolves.toBeNull();
    });
  },
);

describe("findAnnouncementBySegment", () => {
  it("finds an Announcement by its Slug, or by its id with the Slug its URL now has", async () => {
    const announcement = await createAnnouncement({ title: "Ny spelare" });
    const found = { id: announcement.id, slug: announcement.slug };

    await expect(findAnnouncementBySegment(announcement.slug)).resolves.toEqual(found);
    await expect(findAnnouncementBySegment(announcement.id)).resolves.toEqual(found);
  });

  it("misses a Slug or id no Announcement has", async () => {
    await createAnnouncement({ title: "Ny spelare" });

    await expect(findAnnouncementBySegment("2026-11-24-gammal")).resolves.toBeNull();
    await expect(findAnnouncementBySegment(MISSING_ID)).resolves.toBeNull();
  });
});
