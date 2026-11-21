import { describe, expect, it } from "vitest";

import { compareSetListsByDefault } from "./sorting";

describe("compareSetListsByDefault", () => {
  it("puts the newest date first, undated last, and same-date ones in Swedish name order", () => {
    const setLists = [
      { name: "Utan datum B", date: null, current: false },
      { name: "Vårkonsert", date: new Date("2026-05-01"), current: false },
      { name: "Öppet hus", date: new Date("2026-12-13"), current: false },
      { name: "Utan datum a", date: null, current: false },
      { name: "Lucia", date: new Date("2026-12-13"), current: false },
      { name: "adventskonsert", date: new Date("2026-12-13"), current: false },
      { name: "Julkonsert", date: new Date("2026-12-20"), current: false },
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

  it("puts Current Set lists first, each part in that same order", () => {
    const setLists = [
      { name: "Julkonsert", date: new Date("2026-12-20"), current: false },
      { name: "Utan datum", date: null, current: true },
      { name: "Vårkonsert", date: new Date("2026-05-01"), current: true },
      { name: "Lucia", date: new Date("2026-12-13"), current: false },
      { name: "Gammal konsert", date: new Date("2025-05-01"), current: true },
    ];

    expect([...setLists].sort(compareSetListsByDefault).map(({ name }) => name)).toEqual([
      "Vårkonsert",
      "Gammal konsert",
      "Utan datum",
      "Julkonsert",
      "Lucia",
    ]);
  });
});
