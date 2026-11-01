import { describe, expect, it } from "vitest";

import { metadataForFile } from "./fileMetadata";

describe("metadataForFile", () => {
  it("shows the size and the upload date without a time", () => {
    expect(
      metadataForFile({
        id: "1",
        displayName: "Sopran.pdf",
        size: 1536,
        createdAt: new Date("2026-11-01T12:34:00Z"),
      }),
    ).toBe("1.5 KB · 1 nov. 2026");
  });

  it("shows only the size when the upload date is unknown", () => {
    expect(
      metadataForFile({ id: "1", displayName: "Sopran.pdf", size: 500 }),
    ).toBe("500 B");
  });
});
