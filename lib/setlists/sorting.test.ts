import { describe, expect, it } from "vitest";

import { compareSetListsByDefault } from "./sorting";

describe("compareSetListsByDefault", () => {
  it("puts the newest date first, undated last, and same-date ones in Swedish name order", () => {
    const setLists = [
      { name: "Utan datum B", date: null },
      { name: "Vårkonsert", date: new Date("2026-05-01") },
      { name: "Öppet hus", date: new Date("2026-12-13") },
      { name: "Utan datum a", date: null },
      { name: "Lucia", date: new Date("2026-12-13") },
      { name: "adventskonsert", date: new Date("2026-12-13") },
      { name: "Julkonsert", date: new Date("2026-12-20") },
    ];

    expect([...setLists].sort(compareSetListsByDefault).map(({ name }) => name)).toEqual([
      "Julkonsert",
      "adventskonsert",
      "Lucia",
      "Öppet hus",
      "Vårkonsert",
      "Utan datum a",
      "Utan datum B",
    ]);
  });
});
