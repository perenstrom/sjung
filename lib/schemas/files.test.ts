import { describe, expect, it } from "vitest";

import {
  MAX_FILE_SIZE_BYTES,
  parseCreatePieceFileUploadFromFormData,
  parseFileIdFromFormData,
  parseFinalizePieceFileUploadFromFormData,
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
