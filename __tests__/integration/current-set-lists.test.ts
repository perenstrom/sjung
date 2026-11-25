import { describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));

import type { Group, SetList } from "@/app/generated/prisma/client";
import { getCurrentSetLists } from "@/app/actions/setlists";
import { testPrisma } from "../support/db";
import { createGroup, createMember, createPiece, createSetList, createSetListPiece } from "../support/fixtures";
import { actAs } from "../support/session";

async function setList(
  group: Group,
  name: string,
  { current = true, date = null as Date | null } = {},
): Promise<SetList> {
  const created = await createSetList(group, name);
  return testPrisma.setList.update({ where: { id: created.id }, data: { current, date } });
}

describe("getCurrentSetLists", () => {
  it("lists only the Group's Current Set lists, in the default order, with how many Pieces each has", async () => {
    const group = await createGroup();
    const piece = await createPiece({ groupId: group.id, createdById: group.createdById });
    const undated = await setList(group, "Utan datum");
    const lucia = await setList(group, "Lucia", { date: new Date("2026-12-13") });
    await createSetListPiece(lucia, piece, 1000);
    await createSetListPiece(lucia, piece, 2000);
    await setList(group, "Jul", { date: new Date("2026-12-20") });
    await setList(group, "Gammal", { current: false, date: new Date("2027-01-01") });
    await setList(await createGroup(), "Annan grupp");

    actAs((await createMember(group)).id);
    const setLists = await getCurrentSetLists(group.slug);

    expect(setLists.map(({ name, pieceCount }) => [name, pieceCount])).toEqual([
      ["Jul", 0],
      ["Lucia", 2],
      ["Utan datum", 0],
    ]);
    expect(setLists.at(-1)).toMatchObject({ id: undated.id, slug: undated.slug, date: null });
  });
});
