import { describe, expect, it } from "vitest";

import { FILE_INPUT_ACCEPT, isAllowedFile, playableFormatOf } from "@/lib/file-formats";

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
    ["stämma.1.mp3", "audio/mpeg"],
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

  it.each(["Noter.pdf", "foto.jpg", "okänd.exe", "utan-filändelse"])("is null for %s", (fileName) => {
    expect(playableFormatOf({ fileName })).toBeNull();
  });
});

describe("FILE_INPUT_ACCEPT", () => {
  it("lists every accepted extension", () => {
    expect(FILE_INPUT_ACCEPT).toBe(".pdf,.jpg,.jpeg,.png,.webp,.gif,.mp3,.m4a,.aac,.wav");
  });
});
