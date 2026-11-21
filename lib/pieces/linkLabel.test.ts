import { describe, expect, it } from "vitest";

import { labelForLink, metadataForLink } from "./linkLabel";

describe("labelForLink", () => {
  it("uses the label when one is set", () => {
    expect(
      labelForLink({ url: "https://example.com/a", label: "Stämma" }),
    ).toBe("Stämma");
  });

  it("falls back to the hostname when the label is missing or blank", () => {
    expect(
      labelForLink({ url: "https://www.example.com/a", label: null }),
    ).toBe("www.example.com");
    expect(
      labelForLink({ url: "https://example.com/a", label: "   " }),
    ).toBe("example.com");
  });

  it("falls back to the raw url when it can't be parsed", () => {
    expect(labelForLink({ url: "not a url", label: null })).toBe(
      "not a url",
    );
  });
});

describe("metadataForLink", () => {
  it("shows the hostname when the link has a label", () => {
    expect(
      metadataForLink({ url: "https://www.example.com/a", label: "Stämma" }),
    ).toBe("www.example.com");
  });

  it("shows nothing when the hostname is already the visible name", () => {
    expect(
      metadataForLink({ url: "https://example.com/a", label: null }),
    ).toBeNull();
    expect(
      metadataForLink({ url: "https://example.com/a", label: "  " }),
    ).toBeNull();
  });
});
