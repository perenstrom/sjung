import { describe, expect, it } from "vitest";

import { fileDownloadHref, pieceHref, playerHref } from "@/lib/pieces/href";

describe("pieceHref", () => {
  it("links to the piece", () => {
    expect(pieceHref("kor", { slug: "ave-maria" })).toBe("/app/kor/pieces/ave-maria");
  });

  it("carries the set list it was opened from", () => {
    expect(pieceHref("kor", { slug: "ave-maria" }, { fromSetListId: "sl-1" })).toBe(
      "/app/kor/pieces/ave-maria?setlist=sl-1",
    );
  });
});

describe("fileDownloadHref", () => {
  it("links to the route that redirects to the File's download", () => {
    expect(fileDownloadHref("kor", { slug: "partitur" })).toBe("/app/kor/files/partitur");
  });
});

describe("playerHref", () => {
  it("links to the player for one of the Piece's Files", () => {
    expect(playerHref("kor", { slug: "ave-maria" }, { slug: "partitur" })).toBe(
      "/app/kor/pieces/ave-maria/play/partitur",
    );
  });

  it("carries the Set list piece it was opened from", () => {
    expect(playerHref("kor", { slug: "ave-maria" }, { slug: "partitur" }, { fromSetListPieceId: "slp-1" })).toBe(
      "/app/kor/pieces/ave-maria/play/partitur?setlistpiece=slp-1",
    );
  });
});
