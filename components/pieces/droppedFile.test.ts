import { describe, expect, it } from "vitest";

import { pickDroppedFile } from "./droppedFile";

function pdf(name: string): File {
  return new File(["%PDF"], name, { type: "application/pdf" });
}

describe("pickDroppedFile", () => {
  it("picks the file when exactly one is dropped", () => {
    const file = pdf("Sopran.pdf");
    expect(pickDroppedFile([file])).toEqual({ file });
  });

  it("refuses several files at once", () => {
    expect(pickDroppedFile([pdf("Sopran.pdf"), pdf("Alt.pdf")])).toEqual({
      error: "Släpp en fil i taget.",
    });
  });

  it("ignores a drop without files", () => {
    expect(pickDroppedFile([])).toBeNull();
  });
});
