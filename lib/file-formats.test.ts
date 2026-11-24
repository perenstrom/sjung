import { describe, expect, it } from "vitest";

import {
  FILE_INPUT_ACCEPT,
  isAllowedFile,
  needsConversion,
  playableFormatOf,
  uploadMimeType,
} from "@/lib/file-formats";

describe("isAllowedFile", () => {
  it.each([
    ["Noter.pdf", "application/pdf"],
    ["foto.jpg", "image/jpeg"],
    ["foto.jpeg", "image/jpeg"],
    ["bild.png", "image/png"],
    ["bild.webp", "image/webp"],
    ["bild.gif", "image/gif"],
    ["Sopran.mp3", "audio/mpeg"],
    ["Sopran.mp3", "audio/mp3"],
    ["Alt.m4a", "audio/mp4"],
    ["Alt.m4a", "audio/x-m4a"],
    ["Alt.aac", "audio/aac"],
    ["Tenor.wav", "audio/wav"],
    ["Tenor.wav", "audio/x-wav"],
    ["Tenor.wav", "audio/wave"],
    ["BAS.MP3", "audio/mpeg"],
    ["Alla.mid", "audio/midi"],
    ["Alla.mid", "audio/x-midi"],
    ["Alla.mid", "audio/mid"],
    ["Alla.MIDI", "audio/midi"],
    ["Alla.mid", "application/octet-stream"],
    ["stämma.1.mp3", "audio/mpeg"],
    ["Alla.musicxml", "application/vnd.recordare.musicxml+xml"],
    ["Alla.musicxml", "application/xml"],
    ["Alla.xml", "application/xml"],
    ["Alla.xml", "text/xml"],
    ["Alla.mxl", "application/vnd.recordare.musicxml"],
    ["Alla.mxl", "application/zip"],
    ["Alla.MXL", "application/octet-stream"],
    ["Alla.mscz", "application/x-musescore"],
    ["Alla.mscz", "application/zip"],
    ["Alla.MSCZ", "application/octet-stream"],
  ])("accepts %s as %s", (fileName, mimeType) => {
    expect(isAllowedFile({ fileName, mimeType })).toBe(true);
  });

  it.each([
    ["an allowed type with a disallowed extension", "Sopran.exe", "audio/mpeg"],
    ["an allowed extension with a disallowed type", "Sopran.mp3", "text/html"],
    ["the type of another allowed format", "Sopran.mp3", "application/pdf"],
    ["no extension", "Sopran", "audio/mpeg"],
    ["only an extension-like name", ".mp3", "audio/mpeg"],
    ["a format not yet accepted", "Sopran.flac", "audio/flac"],
    ["an unknown type for a format browsers always recognise", "Sopran.mp3", "application/octet-stream"],
  ])("rejects %s", (_case, fileName, mimeType) => {
    expect(isAllowedFile({ fileName, mimeType })).toBe(false);
  });
});

describe("playableFormatOf", () => {
  it.each([
    ["Sopran.mp3", "MP3"],
    ["Alt.M4A", "M4A"],
    ["Alt.aac", "AAC"],
    ["Tenor.wav", "WAV"],
  ])("plays %s as audio, labelled %s", (fileName, label) => {
    expect(playableFormatOf({ fileName })).toEqual({ engine: "audio", label });
  });

  it.each(["Alla.mid", "Alla.midi"])("plays %s as MIDI", (fileName) => {
    expect(playableFormatOf({ fileName })).toEqual({ engine: "midi", label: "MIDI" });
  });

  it.each([
    ["Alla.musicxml", "MusicXML"],
    ["Alla.xml", "MusicXML"],
    ["Alla.mxl", "MXL"],
    ["Alla.mscz", "MuseScore"],
  ])("draws and plays %s as notation, labelled %s", (fileName, label) => {
    expect(playableFormatOf({ fileName })).toEqual({ engine: "notation", label });
  });

  it.each(["Noter.pdf", "foto.jpg", "okänd.exe", "utan-filändelse"])("is null for %s", (fileName) => {
    expect(playableFormatOf({ fileName })).toBeNull();
  });
});

describe("needsConversion", () => {
  it.each([
    ["Alla.mscz", true],
    ["Alla.MSCZ", true],
    ["Alla.mxl", false],
    ["Sopran.mp3", false],
    ["Noter.pdf", false],
  ])("for %s is %s", (fileName, expected) => {
    expect(needsConversion({ fileName })).toBe(expected);
  });
});

describe("FILE_INPUT_ACCEPT", () => {
  it("lists every accepted extension", () => {
    expect(FILE_INPUT_ACCEPT).toBe(
      ".pdf,.jpg,.jpeg,.png,.webp,.gif,.mp3,.m4a,.aac,.wav,.mid,.midi,.musicxml,.xml,.mxl,.mscz",
    );
  });
});

describe("uploadMimeType", () => {
  it("uploads a file as the type the browser reports", () => {
    expect(uploadMimeType({ type: "audio/midi" })).toBe("audio/midi");
  });

  it("uploads a file the browser reports no type for as a generic binary file", () => {
    expect(uploadMimeType({ type: "" })).toBe("application/octet-stream");
  });
});
