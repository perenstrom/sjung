import prisma from "@/lib/prisma";
import { swedishCollator } from "@/lib/data-table/sorting";

/**
 * One Group in the Group overview (CONTEXT.md; ADR-0008, "Group overview"):
 * what the Group is and how big it is, never what is in it.
 */
export type GroupOverviewRow = {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  creator: { name: string; email: string };
  memberCount: number;
  pieceCount: number;
  setListCount: number;
  /** Total size of the Files on the Group's Pieces. */
  storageBytes: number;
  /**
   * The latest update of any of the Group's Pieces, Set lists, Files or
   * People, or of its Group description, or the Group's own creation without
   * any. Deletions don't count.
   */
  lastChangedAt: Date;
};

export type GroupOverview = {
  groups: GroupOverviewRow[];
  totalStorageBytes: number;
};

type FileTotals = { group_id: string; storage_bytes: bigint; last_updated: Date };

/** Every Group in Sjung, by name ignoring case. Callers must check the User is an Operator. */
export async function listGroupOverview(): Promise<GroupOverview> {
  const [groups, pieceUpdates, setListUpdates, personUpdates, fileTotals] = await Promise.all([
    prisma.group.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        createdAt: true,
        // Only when it changed: the overview never shows the description itself.
        descriptionUpdatedAt: true,
        createdBy: { select: { name: true, email: true } },
        _count: { select: { users: true, pieces: true, setLists: true } },
      },
    }),
    prisma.piece.groupBy({ by: ["groupId"], _max: { updatedAt: true } }),
    prisma.setList.groupBy({ by: ["groupId"], _max: { updatedAt: true } }),
    prisma.person.groupBy({ by: ["groupId"], _max: { updatedAt: true } }),
    // Files belong to a Piece, not directly to a Group, so Prisma's groupBy can't reach the Group.
    prisma.$queryRaw<FileTotals[]>`
      SELECT p.group_id, SUM(f.size)::bigint AS storage_bytes, MAX(f.updated_at) AS last_updated
      FROM files f JOIN pieces p ON p.id = f.piece_id
      GROUP BY p.group_id`,
  ]);

  // Each Group's latest change, starting from its own creation.
  const lastChangeByGroup = new Map(groups.map(({ id, createdAt }) => [id, createdAt]));
  const updates = [
    ...groups.map(({ id, descriptionUpdatedAt }) => [id, descriptionUpdatedAt] as const),
    ...[...pieceUpdates, ...setListUpdates, ...personUpdates].map(
      ({ groupId, _max }) => [groupId, _max.updatedAt] as const,
    ),
    ...fileTotals.map(({ group_id, last_updated }) => [group_id, last_updated] as const),
  ];
  for (const [groupId, updatedAt] of updates) {
    const latest = lastChangeByGroup.get(groupId);
    if (updatedAt && latest && updatedAt > latest) {
      lastChangeByGroup.set(groupId, updatedAt);
    }
  }
  const storageByGroup = new Map(fileTotals.map(({ group_id, storage_bytes }) => [group_id, Number(storage_bytes)]));

  const rows = groups
    .map((group): GroupOverviewRow => ({
      id: group.id,
      name: group.name,
      slug: group.slug,
      createdAt: group.createdAt,
      creator: group.createdBy,
      memberCount: group._count.users,
      pieceCount: group._count.pieces,
      setListCount: group._count.setLists,
      storageBytes: storageByGroup.get(group.id) ?? 0,
      lastChangedAt: lastChangeByGroup.get(group.id) ?? group.createdAt,
    }))
    .sort((a, b) => swedishCollator.compare(a.name, b.name));

  return {
    groups: rows,
    totalStorageBytes: rows.reduce((total, { storageBytes }) => total + storageBytes, 0),
  };
}
