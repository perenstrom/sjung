import { describe, expect, it } from "vitest";

import { formData } from "@/__tests__/support/form-data";
import {
  MAX_FILE_SIZE_BYTES,
  parseCreatePieceFileReplaceUploadFromFormData,
  parseCreatePieceFileUploadFromFormData,
  parseFileIdFromFormData,
  parseFinalizePieceFileReplaceFromFormData,
  parseFinalizePieceFileUploadFromFormData,
  parseUpdatePieceFileDisplayNameFromFormData,
} from "@/lib/schemas/files";

const TOO_LARGE = String(MAX_FILE_SIZE_BYTES + 1);

describe("parseCreatePieceFileUploadFromFormData", () => {
  const valid = { pieceId: "piece-1", fileName: "not.pdf", mimeType: "application/pdf", size: "1024" };

  it("parses trimmed fields", () => {
    const fd = formData({
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

  it.each([
    [{ pieceId: "" }, "Stycke saknas"],
    [{ pieceId: "   " }, "Stycke saknas"],
    [{ fileName: "" }, "Filnamn saknas"],
    [{ mimeType: "" }, "Filtyp saknas"],
    [{ mimeType: "text/plain" }, "Filtypen stöds inte"],
    [{ size: "" }, "Filstorlek saknas"],
    [{ size: "abc" }, "Ogiltig filstorlek"],
    [{ size: "12.5" }, "Ogiltig filstorlek"],
    [{ size: "0" }, "Ogiltig filstorlek"],
    [{ size: TOO_LARGE }, "Filen är för stor (max 50 MB)"],
  ])("refuses %j with %s", (change, message) => {
    expect(() => parseCreatePieceFileUploadFromFormData(formData({ ...valid, ...change }))).toThrow(message);
  });
});

describe("parseFinalizePieceFileUploadFromFormData", () => {
  const valid = { pieceId: "p1", fileName: "f.pdf", storagePath: "groups/g1/pieces/p1/key-f.pdf" };

  it("parses every field, ignoring a size and type from the client", () => {
    const fd = formData({ ...valid, mimeType: "text/html", size: "-1" });

    expect(parseFinalizePieceFileUploadFromFormData(fd)).toEqual({ ...valid, displayName: null });
  });

  it.each([
    [{}, null],
    [{ displayName: "" }, null],
    [{ displayName: "  " }, null],
    [{ displayName: "  Visningsnamn  " }, "Visningsnamn"],
  ])("reads the display name %j as %j", (fields, displayName) => {
    expect(parseFinalizePieceFileUploadFromFormData(formData({ ...valid, ...fields })).displayName).toBe(displayName);
  });

  it("throws Sökväg saknas when storagePath is empty", () => {
    expect(() => parseFinalizePieceFileUploadFromFormData(formData({ ...valid, storagePath: "" }))).toThrow(
      "Sökväg saknas",
    );
  });
});

describe("parseCreatePieceFileReplaceUploadFromFormData", () => {
  const valid = { fileId: "file-1", fileName: "not.pdf", mimeType: "application/pdf", size: "1024" };

  it("parses trimmed fields", () => {
    const fd = formData({
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

  it.each([
    [{ fileId: "" }, "Fil saknas"],
    [{ fileName: "not.exe" }, "Filtypen stöds inte"],
    [{ size: TOO_LARGE }, "Filen är för stor (max 50 MB)"],
  ])("refuses %j with %s", (change, message) => {
    expect(() => parseCreatePieceFileReplaceUploadFromFormData(formData({ ...valid, ...change }))).toThrow(message);
  });
});

describe("parseFinalizePieceFileReplaceFromFormData", () => {
  const valid = { fileId: "file-1", fileName: "f.pdf", storagePath: "groups/g1/pieces/p1/key-f.pdf" };

  it("parses every field", () => {
    expect(parseFinalizePieceFileReplaceFromFormData(formData(valid))).toEqual(valid);
  });

  it.each([
    [{ fileId: "" }, "Fil saknas"],
    [{ storagePath: "" }, "Sökväg saknas"],
  ])("refuses %j with %s", (change, message) => {
    expect(() => parseFinalizePieceFileReplaceFromFormData(formData({ ...valid, ...change }))).toThrow(message);
  });
});

describe("parseFileIdFromFormData", () => {
  it("parses the trimmed fileId", () => {
    expect(parseFileIdFromFormData(formData({ fileId: "  file-uuid  " }))).toBe("file-uuid");
  });

  it("throws Fil saknas when fileId is missing or empty", () => {
    expect(() => parseFileIdFromFormData(formData({}))).toThrow("Fil saknas");
    expect(() => parseFileIdFromFormData(formData({ fileId: "" }))).toThrow("Fil saknas");
  });
});

describe("parseUpdatePieceFileDisplayNameFromFormData", () => {
  it("parses the trimmed fileId and display name", () => {
    const fd = formData({ fileId: "  file-1  ", displayName: "  Mitt namn  " });

    expect(parseUpdatePieceFileDisplayNameFromFormData(fd)).toEqual({ fileId: "file-1", displayName: "Mitt namn" });
  });

  it.each([
    [{ fileId: "", displayName: "Namn" }, "Fil saknas"],
    [{ fileId: "file-1", displayName: "" }, "Visningsnamn saknas"],
    [{ fileId: "file-1", displayName: "   " }, "Visningsnamn saknas"],
    [{ fileId: "file-1" }, "Visningsnamn saknas"],
  ])("refuses %j with %s", (fields, message) => {
    expect(() => parseUpdatePieceFileDisplayNameFromFormData(formData(fields))).toThrow(message);
  });
});
