import { describe, expect, it } from "vitest";

import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  PIECE_FILE_ACCEPT_ATTR,
  parseCreatePieceFileReplaceUploadFromFormData,
  parseCreatePieceFileUploadFromFormData,
  parseFileIdFromFormData,
  parseFinalizePieceFileReplaceFromFormData,
  parseFinalizePieceFileUploadFromFormData,
  parseUpdatePieceFileDisplayNameFromFormData,
} from "@/lib/schemas/files";

function createFormData(values: Record<string, string | File | undefined>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) {
      continue;
    }
    formData.set(key, value);
  }
  return formData;
}

const validUploadBase = {
  pieceId: "piece-1",
  fileName: "not.pdf",
  mimeType: "application/pdf",
  size: "1024",
};

describe("parseCreatePieceFileUploadFromFormData", () => {
  it("parses trimmed fields", () => {
    const fd = createFormData({
      pieceId: "  piece-1  ",
      fileName: "  doc.pdf  ",
      mimeType: "  application/pdf  ",
      size: "  2048  ",
    });
    expect(parseCreatePieceFileUploadFromFormData(fd)).toEqual({
      pieceId: "piece-1",
      fileName: "doc.pdf",
      mimeType: "application/pdf",
      size: 2048,
    });
  });

  it("throws Stycke saknas when pieceId is empty", () => {
    expect(() =>
      parseCreatePieceFileUploadFromFormData(
        createFormData({ ...validUploadBase, pieceId: "" })
      )
    ).toThrow("Stycke saknas");
    expect(() =>
      parseCreatePieceFileUploadFromFormData(
        createFormData({ ...validUploadBase, pieceId: "   " })
      )
    ).toThrow("Stycke saknas");
  });

  it("throws Filnamn saknas when fileName is empty", () => {
    expect(() =>
      parseCreatePieceFileUploadFromFormData(
        createFormData({ ...validUploadBase, fileName: "" })
      )
    ).toThrow("Filnamn saknas");
  });

  it("throws Filtyp saknas when mimeType is empty", () => {
    expect(() =>
      parseCreatePieceFileUploadFromFormData(
        createFormData({ ...validUploadBase, mimeType: "" })
      )
    ).toThrow("Filtyp saknas");
  });

  it("throws Filtypen stöds inte for disallowed mime", () => {
    expect(() =>
      parseCreatePieceFileUploadFromFormData(
        createFormData({ ...validUploadBase, mimeType: "text/plain" })
      )
    ).toThrow("Filtypen stöds inte");
  });

  it("throws Filstorlek saknas when size is empty", () => {
    expect(() =>
      parseCreatePieceFileUploadFromFormData(
        createFormData({ ...validUploadBase, size: "" })
      )
    ).toThrow("Filstorlek saknas");
  });

  it("throws Ogiltig filstorlek for non-integer or non-positive size", () => {
    expect(() =>
      parseCreatePieceFileUploadFromFormData(
        createFormData({ ...validUploadBase, size: "abc" })
      )
    ).toThrow("Ogiltig filstorlek");
    expect(() =>
      parseCreatePieceFileUploadFromFormData(
        createFormData({ ...validUploadBase, size: "12.5" })
      )
    ).toThrow("Ogiltig filstorlek");
    expect(() =>
      parseCreatePieceFileUploadFromFormData(
        createFormData({ ...validUploadBase, size: "0" })
      )
    ).toThrow("Ogiltig filstorlek");
  });

  it("throws Filen är för stor (max 50 MB) when size exceeds cap", () => {
    expect(() =>
      parseCreatePieceFileUploadFromFormData(
        createFormData({
          ...validUploadBase,
          size: String(MAX_FILE_SIZE_BYTES + 1),
        })
      )
    ).toThrow("Filen är för stor (max 50 MB)");
  });
});

describe("parseFinalizePieceFileUploadFromFormData", () => {
  const validFinalize = {
    pieceId: "p1",
    fileName: "f.pdf",
    storagePath: "groups/g1/pieces/p1/key-f.pdf",
    mimeType: "application/pdf",
    size: "100",
  };

  it("parses all fields and null displayName when absent", () => {
    const fd = createFormData(validFinalize);
    expect(parseFinalizePieceFileUploadFromFormData(fd)).toMatchObject({
      ...validFinalize,
      size: 100,
      displayName: null,
    });
  });

  it("trims displayName when present", () => {
    const fd = createFormData({ ...validFinalize, displayName: "  Visningsnamn  " });
    expect(parseFinalizePieceFileUploadFromFormData(fd).displayName).toBe("Visningsnamn");
  });

  it("returns null displayName for empty or whitespace displayName", () => {
    expect(
      parseFinalizePieceFileUploadFromFormData(
        createFormData({ ...validFinalize, displayName: "" })
      ).displayName
    ).toBeNull();
    expect(
      parseFinalizePieceFileUploadFromFormData(
        createFormData({ ...validFinalize, displayName: "  " })
      ).displayName
    ).toBeNull();
  });

  it("throws Sökväg saknas when storagePath is empty", () => {
    expect(() =>
      parseFinalizePieceFileUploadFromFormData(
        createFormData({ ...validFinalize, storagePath: "" })
      )
    ).toThrow("Sökväg saknas");
  });
});

const validReplaceBase = {
  fileId: "file-1",
  fileName: "not.pdf",
  mimeType: "application/pdf",
  size: "1024",
};

describe("parseCreatePieceFileReplaceUploadFromFormData", () => {
  it("parses trimmed fields", () => {
    const fd = createFormData({
      fileId: "  file-1  ",
      fileName: "  doc.pdf  ",
      mimeType: "  application/pdf  ",
      size: "  2048  ",
    });
    expect(parseCreatePieceFileReplaceUploadFromFormData(fd)).toEqual({
      fileId: "file-1",
      fileName: "doc.pdf",
      mimeType: "application/pdf",
      size: 2048,
    });
  });

  it("throws Fil saknas when fileId is empty", () => {
    expect(() =>
      parseCreatePieceFileReplaceUploadFromFormData(
        createFormData({ ...validReplaceBase, fileId: "" })
      )
    ).toThrow("Fil saknas");
  });

  it("throws Filtypen stöds inte for disallowed mime", () => {
    expect(() =>
      parseCreatePieceFileReplaceUploadFromFormData(
        createFormData({ ...validReplaceBase, mimeType: "text/plain" })
      )
    ).toThrow("Filtypen stöds inte");
  });

  it("throws Filen är för stor (max 50 MB) when size exceeds cap", () => {
    expect(() =>
      parseCreatePieceFileReplaceUploadFromFormData(
        createFormData({
          ...validReplaceBase,
          size: String(MAX_FILE_SIZE_BYTES + 1),
        })
      )
    ).toThrow("Filen är för stor (max 50 MB)");
  });
});

describe("parseFinalizePieceFileReplaceFromFormData", () => {
  const validFinalizeReplace = {
    fileId: "file-1",
    fileName: "f.pdf",
    storagePath: "groups/g1/pieces/p1/key-f.pdf",
    mimeType: "application/pdf",
    size: "100",
  };

  it("parses all fields", () => {
    const fd = createFormData(validFinalizeReplace);
    expect(parseFinalizePieceFileReplaceFromFormData(fd)).toEqual({
      ...validFinalizeReplace,
      size: 100,
    });
  });

  it("throws Fil saknas when fileId is empty", () => {
    expect(() =>
      parseFinalizePieceFileReplaceFromFormData(
        createFormData({ ...validFinalizeReplace, fileId: "" })
      )
    ).toThrow("Fil saknas");
  });

  it("throws Sökväg saknas when storagePath is empty", () => {
    expect(() =>
      parseFinalizePieceFileReplaceFromFormData(
        createFormData({ ...validFinalizeReplace, storagePath: "" })
      )
    ).toThrow("Sökväg saknas");
  });
});

describe("parseFileIdFromFormData", () => {
  it("parses trimmed fileId", () => {
    const fd = createFormData({ fileId: "  file-uuid  " });
    expect(parseFileIdFromFormData(fd)).toBe("file-uuid");
  });

  it("throws Fil saknas when fileId is empty", () => {
    expect(() => parseFileIdFromFormData(createFormData({ fileId: "" }))).toThrow("Fil saknas");
    expect(() => parseFileIdFromFormData(createFormData({}))).toThrow("Fil saknas");
  });
});

describe("PIECE_FILE_ACCEPT_ATTR", () => {
  it("lists an accept pattern for every allowed mime type, pdf as an extension", () => {
    expect(PIECE_FILE_ACCEPT_ATTR).toBe(".pdf,image/jpeg,image/png,image/webp,image/gif");
  });

  it("stays in sync with ALLOWED_MIME_TYPES", () => {
    const patterns = PIECE_FILE_ACCEPT_ATTR.split(",");
    expect(patterns).toHaveLength(ALLOWED_MIME_TYPES.size);
    expect(patterns).toContain(".pdf");
    for (const mime of ALLOWED_MIME_TYPES) {
      if (mime === "application/pdf") continue;
      expect(patterns).toContain(mime);
    }
  });
});

describe("parseUpdatePieceFileDisplayNameFromFormData", () => {
  it("parses trimmed fileId and displayName", () => {
    const fd = createFormData({
      fileId: "  file-1  ",
      displayName: "  Mitt namn  ",
    });
    expect(parseUpdatePieceFileDisplayNameFromFormData(fd)).toEqual({
      fileId: "file-1",
      displayName: "Mitt namn",
    });
  });

  it("throws Fil saknas when fileId is empty", () => {
    expect(() =>
      parseUpdatePieceFileDisplayNameFromFormData(
        createFormData({ fileId: "", displayName: "Namn" })
      )
    ).toThrow("Fil saknas");
  });

  it("throws Visningsnamn saknas when displayName is empty or whitespace", () => {
    expect(() =>
      parseUpdatePieceFileDisplayNameFromFormData(
        createFormData({ fileId: "file-1", displayName: "" })
      )
    ).toThrow("Visningsnamn saknas");
    expect(() =>
      parseUpdatePieceFileDisplayNameFromFormData(
        createFormData({ fileId: "file-1", displayName: "   " })
      )
    ).toThrow("Visningsnamn saknas");
    expect(() =>
      parseUpdatePieceFileDisplayNameFromFormData(createFormData({ fileId: "file-1" }))
    ).toThrow("Visningsnamn saknas");
  });
});
