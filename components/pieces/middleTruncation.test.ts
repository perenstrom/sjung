import { describe, expect, it } from "vitest";

import { splitForMiddleTruncation } from "./middleTruncation";

describe("splitForMiddleTruncation", () => {
  it("keeps the last 10 characters as the end, which never shrinks", () => {
    expect(splitForMiddleTruncation("Sopran_stämma_REVIDERAD.pdf")).toEqual({
      start: "Sopran_stämma_REV",
      end: "IDERAD.pdf",
    });
  });

  it("puts all of a name of at most 10 characters in the start", () => {
    expect(splitForMiddleTruncation("Alt_2a.pdf")).toEqual({
      start: "Alt_2a.pdf",
      end: "",
    });
  });

  it("splits a name of 11 characters after its first character", () => {
    expect(splitForMiddleTruncation("Alt_2a1.pdf")).toEqual({
      start: "A",
      end: "lt_2a1.pdf",
    });
  });

  it("splits on characters, not UTF-16 code units", () => {
    expect(splitForMiddleTruncation("🎵🎵🎵🎵🎵🎵🎵🎵.pdf")).toEqual({
      start: "🎵🎵",
      end: "🎵🎵🎵🎵🎵🎵.pdf",
    });
  });
});
