import { describe, expect, it } from "vitest";

import { formatDate } from "@/lib/format-date";

describe("formatDate", () => {
  it("formats a date as an ISO-style Swedish date", () => {
    expect(formatDate(new Date("2026-03-14T12:00:00Z"))).toBe("2026-03-14");
  });

  it("returns null when there is no date", () => {
    expect(formatDate(null)).toBeNull();
  });
});
