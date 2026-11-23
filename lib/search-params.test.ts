import { describe, expect, it } from "vitest";

import { searchParamId } from "@/lib/search-params";

describe("searchParamId", () => {
  it("reads the id a link carries, such as the set list on a piece link", () => {
    expect(searchParamId("sl-1")).toBe("sl-1");
  });

  it("ignores a missing, empty or repeated param", () => {
    expect(searchParamId(undefined)).toBeUndefined();
    expect(searchParamId("")).toBeUndefined();
    expect(searchParamId(["sl-1", "sl-2"])).toBeUndefined();
  });
});
