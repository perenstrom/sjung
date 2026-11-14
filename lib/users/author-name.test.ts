import { describe, expect, it } from "vitest";

import { authorName, DELETED_USER_NAME } from "./author-name";

describe("authorName", () => {
  it("is the author's name while their User exists", () => {
    expect(authorName("Anna Andersson")).toBe("Anna Andersson");
  });

  it("is Borttagen användare once the author has deleted their account", () => {
    expect(authorName(null)).toBe("Borttagen användare");
    expect(DELETED_USER_NAME).toBe("Borttagen användare");
  });
});
