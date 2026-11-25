import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { revalidatePath } from "next/cache";
import {
  revalidateAppAndMyGroupsWithGroupRoute,
  revalidateGroupSetListDetailRoutes,
  revalidateGroupSetListsRoutes,
} from "./group-routes";

beforeEach(() => {
  vi.mocked(revalidatePath).mockClear();
});

// Home lists the Current Set lists with their name, date and Piece count, so
// every Set list change reaches it, as does every refresh after joining,
// creating or renaming the Group.
describe("refreshing a Group's Home", () => {
  it.each([
    ["a change to the Group's Set lists", () => revalidateGroupSetListsRoutes("kor")],
    ["a change to one Set list", () => revalidateGroupSetListDetailRoutes("kor", "lucia")],
    ["joining or creating the Group", () => revalidateAppAndMyGroupsWithGroupRoute("kor")],
  ])("follows %s", (_change, revalidate) => {
    revalidate();

    expect(vi.mocked(revalidatePath).mock.calls.map(([path]) => path)).toContain("/app/kor");
  });
});
