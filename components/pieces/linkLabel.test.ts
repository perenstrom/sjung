import { describe, expect, it } from "vitest";

import { labelForLink } from "./linkLabel";

describe("labelForLink", () => {
  it("uses the label when one is set", () => {
    expect(
      labelForLink({ id: "1", url: "https://example.com/a", label: "Stämma" }),
    ).toBe("Stämma");
  });

  it("falls back to the hostname when the label is missing or blank", () => {
    expect(
      labelForLink({ id: "1", url: "https://www.example.com/a", label: null }),
    ).toBe("www.example.com");
    expect(
      labelForLink({ id: "1", url: "https://example.com/a", label: "   " }),
    ).toBe("example.com");
  });

  it("falls back to the raw url when it can't be parsed", () => {
    expect(labelForLink({ id: "1", url: "not a url", label: null })).toBe(
      "not a url",
    );
  });
});
