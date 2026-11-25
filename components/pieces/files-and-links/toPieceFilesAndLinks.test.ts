import { describe, expect, it } from "vitest";

import { toPieceFilesAndLinks } from "./toPieceFilesAndLinks";

const pieceWith = (fileName: string) => ({
  files: [{ id: "f1", slug: "f1", displayName: fileName, size: 1024, category: null, fileName }],
  links: [],
});

describe("toPieceFilesAndLinks", () => {
  it.each([
    ["Partitur.mscz", "notation"],
    ["Sopran.mp3", "audio"],
    ["Sopran.mid", "midi"],
    ["Noter.pdf", null],
  ])("gives %s the player engine %s", (fileName, engine) => {
    expect(toPieceFilesAndLinks(pieceWith(fileName)).files[0].engine).toBe(engine);
  });
});
