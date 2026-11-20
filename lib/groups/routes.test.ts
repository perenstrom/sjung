import { describe, expect, it } from "vitest";

import {
  groupMembersPath,
  groupPath,
  groupPeoplePath,
  groupPersonPath,
  groupPiecesPath,
  groupSetListPath,
  groupSetListsPath,
} from "@/lib/groups/routes";

describe("group routes", () => {
  it.each([
    ["the group", groupPath, "/app/kor"],
    ["Noter", groupPiecesPath, "/app/kor/pieces"],
    ["Upphovspersoner", groupPeoplePath, "/app/kor/people"],
    ["Repertoarer", groupSetListsPath, "/app/kor/setlists"],
    ["Medlemmar", groupMembersPath, "/app/kor/members"],
  ])("addresses %s", (_what, path, expected) => {
    expect(path("kor")).toBe(expected);
  });

  it("addresses one Person", () => {
    expect(groupPersonPath("kor", "person-1")).toBe("/app/kor/people/person-1");
  });

  it("addresses one Set list", () => {
    expect(groupSetListPath("kor", "sl-1")).toBe("/app/kor/setlists/sl-1");
  });
});
