import { describe, expect, it } from "vitest";

import { formatSetListDate } from "@/lib/setlists/date";

describe("formatSetListDate", () => {
  it("formats a date as an ISO-style Swedish date", () => {
    expect(formatSetListDate(new Date("2026-03-14T12:00:00Z"))).toBe("2026-03-14");
  });

  it("returns null when the set list has no date", () => {
    expect(formatSetListDate(null)).toBeNull();
  });
});
