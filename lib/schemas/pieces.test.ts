import { describe, expect, it } from "vitest";

import {
  parseLinkIdFromFormData,
  parseOptionalLinkLabelFromFormData,
  parsePieceCreditsFromFormData,
  parsePieceGroupSlugFromFormData,
  parsePieceIdFromFormData,
  parsePieceNameFromFormData,
  parseRequiredHttpUrlFromFormData,
} from "@/lib/schemas/pieces";

function createFormData(values: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(values)) {
    formData.set(key, value);
  }
  return formData;
}

describe("parsePieceGroupSlugFromFormData", () => {
  it("returns trimmed slug", () => {
    const fd = createFormData({ groupSlug: "  my-group  " });
    expect(parsePieceGroupSlugFromFormData(fd)).toBe("my-group");
  });

  it("throws Saknar grupp when missing or empty", () => {
    expect(() => parsePieceGroupSlugFromFormData(createFormData({}))).toThrow(
      "Saknar grupp"
    );
    expect(() =>
      parsePieceGroupSlugFromFormData(createFormData({ groupSlug: "   " }))
    ).toThrow("Saknar grupp");
  });
});

describe("parsePieceNameFromFormData", () => {
  it("returns trimmed name", () => {
    const fd = createFormData({ name: "  Sång  " });
    expect(parsePieceNameFromFormData(fd)).toBe("Sång");
  });

  it("throws Namn krävs when empty", () => {
    expect(() =>
      parsePieceNameFromFormData(createFormData({ name: "  " }))
    ).toThrow("Namn krävs");
  });
});

describe("parsePieceIdFromFormData", () => {
  it("returns trimmed id", () => {
    const fd = createFormData({ pieceId: "  id-1  " });
    expect(parsePieceIdFromFormData(fd)).toBe("id-1");
  });

  it("throws Stycke saknas when empty", () => {
    expect(() =>
      parsePieceIdFromFormData(createFormData({ pieceId: "" }))
    ).toThrow("Stycke saknas");
  });
});

describe("parseLinkIdFromFormData", () => {
  it("throws Länk saknas when empty", () => {
    expect(() =>
      parseLinkIdFromFormData(createFormData({ linkId: "" }))
    ).toThrow("Länk saknas");
  });
});

describe("parseRequiredHttpUrlFromFormData", () => {
  it("accepts http and https URLs", () => {
    const http = parseRequiredHttpUrlFromFormData(
      createFormData({ url: "http://example.com/path" })
    );
    expect(http.protocol).toBe("http:");
    const https = parseRequiredHttpUrlFromFormData(
      createFormData({ url: "  https://example.com  " })
    );
    expect(https.href.startsWith("https://")).toBe(true);
  });

  it("throws Länk krävs when url missing or whitespace", () => {
    expect(() =>
      parseRequiredHttpUrlFromFormData(createFormData({}))
    ).toThrow("Länk krävs");
    expect(() =>
      parseRequiredHttpUrlFromFormData(createFormData({ url: "   " }))
    ).toThrow("Länk krävs");
  });

  it("throws Ogiltig länk for non-URL strings", () => {
    expect(() =>
      parseRequiredHttpUrlFromFormData(createFormData({ url: "not a url" }))
    ).toThrow("Ogiltig länk");
  });

  it("throws Länk måste börja med http eller https for non-http(s) schemes", () => {
    expect(() =>
      parseRequiredHttpUrlFromFormData(createFormData({ url: "ftp://x.com" }))
    ).toThrow("Länk måste börja med http eller https");
  });
});

describe("parseOptionalLinkLabelFromFormData", () => {
  it("returns null for empty or missing label", () => {
    expect(parseOptionalLinkLabelFromFormData(createFormData({}))).toBe(null);
    expect(
      parseOptionalLinkLabelFromFormData(createFormData({ label: "  " }))
    ).toBe(null);
  });

  it("returns trimmed label", () => {
    expect(
      parseOptionalLinkLabelFromFormData(
        createFormData({ label: "  Partitur  " })
      )
    ).toBe("Partitur");
  });
});

describe("parsePieceCreditsFromFormData", () => {
  it("returns empty array when credits field absent", () => {
    expect(parsePieceCreditsFromFormData(createFormData({}))).toEqual([]);
  });

  it("parses valid JSON array", () => {
    const fd = createFormData({
      credits: JSON.stringify([
        { personId: "p1", role: "Kompositör" },
        { personId: "p2", role: "  Text  " },
      ]),
    });
    expect(parsePieceCreditsFromFormData(fd)).toEqual([
      { personId: "p1", role: "Kompositör" },
      { personId: "p2", role: "Text" },
    ]);
  });

  it("throws Ogiltigt format för medverkande for invalid JSON", () => {
    const fd = createFormData({ credits: "not-json" });
    expect(() => parsePieceCreditsFromFormData(fd)).toThrow(
      "Ogiltigt format för medverkande"
    );
  });

  it("throws Ogiltigt format för medverkande for non-array JSON", () => {
    const fd = createFormData({ credits: "{}" });
    expect(() => parsePieceCreditsFromFormData(fd)).toThrow(
      "Ogiltigt format för medverkande"
    );
  });

  it("throws Ogiltigt format för medverkande when personId or role empty after trim", () => {
    const fd = createFormData({
      credits: JSON.stringify([{ personId: " ", role: "x" }]),
    });
    expect(() => parsePieceCreditsFromFormData(fd)).toThrow(
      "Ogiltigt format för medverkande"
    );
  });
});
