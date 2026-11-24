import { describe, expect, it } from "vitest";

import { fileDownloadHref, pieceHref, playerHref } from "@/lib/pieces/href";

describe("pieceHref", () => {
  it("links to the piece", () => {
    expect(pieceHref("kor", "p-1")).toBe("/app/kor/pieces/p-1");
  });

  it("carries the set list it was opened from", () => {
    expect(pieceHref("kor", "p-1", { fromSetListId: "sl-1" })).toBe("/app/kor/pieces/p-1?setlist=sl-1");
  });
});

describe("fileDownloadHref", () => {
  it("links to the route that redirects to the File's download", () => {
    expect(fileDownloadHref("kor", "f-1")).toBe("/app/kor/files/f-1");
  });
});

describe("playerHref", () => {
  it("links to the player for one of the Piece's Files", () => {
    expect(playerHref("kor", "p-1", "f-1")).toBe("/app/kor/pieces/p-1/play/f-1");
  });

  it("carries the Set list piece it was opened from", () => {
    expect(playerHref("kor", "p-1", "f-1", { fromSetListPieceId: "slp-1" })).toBe(
      "/app/kor/pieces/p-1/play/f-1?setlistpiece=slp-1",
    );
  });
});
