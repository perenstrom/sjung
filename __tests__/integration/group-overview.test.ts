import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("notFound");
  }),
}));

import { testPrisma } from "../support/db";
import {
  createFile,
  createGroup,
  createMember,
  createPerson,
  createPiece,
  createSetList,
  createUser,
} from "../support/fixtures";
import { createOperator, OPERATOR_EMAIL } from "../support/operators";
import { actAs } from "../support/session";
import { getGroupOverview } from "@/app/actions/operators";
import { setGroupDescription } from "@/app/actions/groups";
import { formData } from "../support/form-data";

beforeEach(() => {
  vi.stubEnv("OPERATORS_EMAIL", OPERATOR_EMAIL);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Group overview", () => {
  it("is not found for a Verified user who isn't an Operator, even the Group's Creator", async () => {
    const creator = await createUser({ email: "creator@sjung.test" });
    await createGroup({ createdById: creator.id });
    actAs(creator.id);

    await expect(getGroupOverview()).rejects.toThrow("notFound");
  });

  it("counts, for an Operator in none of them, each Group's Members, Pieces, Set lists and storage, and when its content last changed", async () => {
    const operator = await createOperator();

    const creator = await createUser({ name: "Bo Ek", email: "bo@sjung.test" });
    const busy = await createGroup({ name: "Bkören", slug: "bkoren", createdById: creator.id });
    await createMember(busy);
    await createMember(busy);
    const piece = await createPiece({ groupId: busy.id, createdById: creator.id });
    const otherPiece = await createPiece({ groupId: busy.id, createdById: creator.id });
    const file = await createFile(piece);
    await createFile(otherPiece);
    await testPrisma.file.update({ where: { id: file.id }, data: { size: 2_000_000 } });
    await createSetList(busy);
    const person = await createPerson(busy);
    const latest = new Date(Date.now() + 60 * 60_000);
    await testPrisma.person.update({ where: { id: person.id }, data: { updatedAt: latest } });

    // Created later, but sorts first: the sort ignores case.
    const empty = await createGroup({ name: "alfakören", slug: "alfakoren", createdById: creator.id });

    actAs(operator.id);
    const overview = await getGroupOverview();

    expect(overview.groups).toEqual([
      {
        id: empty.id,
        name: "alfakören",
        slug: "alfakoren",
        createdAt: empty.createdAt,
        creator: { name: "Bo Ek", email: "bo@sjung.test" },
        memberCount: 1,
        pieceCount: 0,
        setListCount: 0,
        storageBytes: 0,
        lastChangedAt: empty.createdAt,
      },
      {
        id: busy.id,
        name: "Bkören",
        slug: "bkoren",
        createdAt: busy.createdAt,
        creator: { name: "Bo Ek", email: "bo@sjung.test" },
        memberCount: 3,
        pieceCount: 2,
        setListCount: 1,
        storageBytes: 2_000_000 + 1024,
        lastChangedAt: latest,
      },
    ]);
    expect(overview.totalStorageBytes).toBe(2_000_000 + 1024);
  });

  it("counts a change to the Group description as a change, without showing the text", async () => {
    const operator = await createOperator();
    const creator = await createUser();
    const group = await createGroup({ createdById: creator.id });
    await createPiece({ groupId: group.id, createdById: creator.id });

    actAs(creator.id);
    await setGroupDescription(formData({ groupSlug: group.slug, description: "Hemlig repetitionsplats" }));
    const { homeUpdatedAt } = await testPrisma.group.findUniqueOrThrow({ where: { id: group.id } });

    actAs(operator.id);
    const overview = await getGroupOverview();

    expect(overview.groups[0]?.lastChangedAt).toEqual(homeUpdatedAt);
    expect(JSON.stringify(overview)).not.toContain("Hemlig");
  });
});
