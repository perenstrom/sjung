import { describe, expect, it } from "vitest";

import { announcementSlug, firstFreeSlug, slugifyName } from "@/lib/slug";

describe("slugifyName", () => {
  it("normalizes Swedish characters and punctuation", () => {
    expect(slugifyName("Vår Kör 2026!", "stycke")).toBe("var-kor-2026");
  });

  it("uses the fallback for a name with nothing URL-safe in it", () => {
    expect(slugifyName("   ", "stycke")).toBe("stycke");
    expect(slugifyName("!!!", "person")).toBe("person");
  });
});

describe("firstFreeSlug", () => {
  it("keeps the base when it is free", () => {
    expect(firstFreeSlug("ave-maria", () => false)).toBe("ave-maria");
  });

  it("numbers from 2 on a clash", () => {
    const taken = new Set(["ave-maria", "ave-maria-2"]);
    expect(firstFreeSlug("ave-maria", (slug) => taken.has(slug))).toBe("ave-maria-3");
  });
});

describe("announcementSlug", () => {
  it("prefixes the title's slug with the publishing date in Stockholm", () => {
    // 00:30 in Stockholm on 24 November is still 23 November in UTC.
    expect(announcementSlug("Ny spelare", new Date("2026-11-23T23:30:00Z"))).toBe("2026-11-24-ny-spelare");
  });

  it("follows summer time", () => {
    // 00:30 in Stockholm on 1 July is 22:30 UTC the day before.
    expect(announcementSlug("Sommar", new Date("2026-06-30T22:30:00Z"))).toBe("2026-07-01-sommar");
  });

  it("falls back to nyhet for a title with nothing URL-safe in it", () => {
    expect(announcementSlug("!!!", new Date("2026-11-24T12:00:00Z"))).toBe("2026-11-24-nyhet");
  });
});
