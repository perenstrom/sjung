import { describe, expect, it } from "vitest";

import { COVER_IMAGE_MAX_SIZE_BYTES, coverImageRefusal } from "@/lib/schemas/cover-image";

describe("coverImageRefusal", () => {
  it.each(["image/jpeg", "image/png", "image/webp"])("accepts %s up to 5 MB", (contentType) => {
    expect(coverImageRefusal({ contentType, size: COVER_IMAGE_MAX_SIZE_BYTES })).toBeNull();
  });

  it.each(["image/gif", "image/heic", "application/pdf", ""])("refuses %j", (contentType) => {
    expect(coverImageRefusal({ contentType, size: 1024 })).toBe(
      "Omslagsbilden måste vara en JPEG-, PNG- eller WebP-bild",
    );
  });

  it("refuses an image over 5 MB", () => {
    expect(coverImageRefusal({ contentType: "image/png", size: COVER_IMAGE_MAX_SIZE_BYTES + 1 })).toBe(
      "Omslagsbilden är för stor (max 5 MB)",
    );
  });

  it.each([0, -1, 1.5, Number.NaN])("refuses a size of %s", (size) => {
    expect(coverImageRefusal({ contentType: "image/png", size })).toBe("Ogiltig filstorlek");
  });
});
