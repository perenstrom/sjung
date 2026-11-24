import type { Prisma, PrismaClient } from "@/app/generated/prisma/client";
import { announcementSlug, firstFreeSlug, slugifyName, slugsFrom } from "@/lib/slug";

type Db = PrismaClient | Prisma.TransactionClient;

/** Group content that has its own page, and so a Slug (ADR-0011). */
export type SluggedKind = "piece" | "setList" | "person" | "file";

/** What each kind's Slug becomes when nothing in its name is URL-safe. */
const FALLBACK: Record<SluggedKind, string> = {
  piece: "stycke",
  setList: "repertoar",
  person: "person",
  file: "fil",
};

/** Every Slug of this kind in the Group that is `base` or numbered from it, except `exceptId`'s own. */
async function slugsTaken(db: Db, kind: SluggedKind, groupId: string, base: string, exceptId?: string) {
  const where = {
    ...slugsFrom(base),
    ...(exceptId ? { NOT: { id: exceptId } } : {}),
  };
  const select = { slug: true } as const;
  const rows =
    kind === "piece"
      ? await db.piece.findMany({ where: { ...where, groupId }, select })
      : kind === "setList"
        ? await db.setList.findMany({ where: { ...where, groupId }, select })
        : kind === "person"
          ? await db.person.findMany({ where: { ...where, groupId }, select })
          : await db.file.findMany({ where: { ...where, piece: { groupId } }, select });
  return rows.map((row) => row.slug);
}

/**
 * A free Slug in the Group for each name, in order, for rows of this kind
 * about to be saved together: unique among the Group's rows of the kind and
 * among each other (CONTEXT.md, "Slug"). Pass `exceptId` when renaming, so the
 * row never clashes with itself and keeps its Slug if the name makes the same.
 */
export async function freeContentSlugs(
  db: Db,
  kind: SluggedKind,
  groupId: string,
  names: readonly string[],
  exceptId?: string,
): Promise<string[]> {
  const takenByBase = new Map<string, Set<string>>();
  const slugs: string[] = [];
  for (const name of names) {
    const base = slugifyName(name, FALLBACK[kind]);
    let taken = takenByBase.get(base);
    if (!taken) {
      taken = new Set(await slugsTaken(db, kind, groupId, base, exceptId));
      takenByBase.set(base, taken);
    }
    const slug = firstFreeSlug(base, (candidate) => taken.has(candidate));
    taken.add(slug);
    slugs.push(slug);
  }
  return slugs;
}

/** {@link freeContentSlugs} for one name. */
export async function freeContentSlug(
  db: Db,
  kind: SluggedKind,
  groupId: string,
  name: string,
  exceptId?: string,
): Promise<string> {
  const [slug] = await freeContentSlugs(db, kind, groupId, [name], exceptId);
  return slug;
}

/**
 * A free Slug for an Announcement published at `publishedAt`: that date in
 * Stockholm and the title, numbered on a clash with another that day.
 */
export async function freeAnnouncementSlug(
  db: Db,
  title: string,
  publishedAt: Date,
  exceptId?: string,
): Promise<string> {
  const base = announcementSlug(title, publishedAt);
  const rows = await db.announcement.findMany({
    where: {
      ...slugsFrom(base),
      ...(exceptId ? { NOT: { id: exceptId } } : {}),
    },
    select: { slug: true },
  });
  const taken = new Set(rows.map((row) => row.slug));
  return firstFreeSlug(base, (candidate) => taken.has(candidate));
}
