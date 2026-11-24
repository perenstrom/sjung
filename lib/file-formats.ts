/**
 * The formats a File may have. A file's format comes from its extension;
 * each format lists the MIME types a browser may report for it, since
 * browsers report some formats inconsistently. No byte sniffing.
 */
type FileFormat = {
  extensions: readonly string[];
  mimeTypes: readonly string[];
  /** How the player plays a File of this format; absent when it is not a Playable File (see CONTEXT.md). */
  playable?: PlayableFormat;
};

/** Which player engine plays a Playable File (ADR-0010). */
export type PlayerEngine = "audio" | "midi" | "notation";

/** A Playable File's format, as the player needs it. */
export type PlayableFormat = {
  /** Which player engine plays it. */
  engine: PlayerEngine;
  /** The format's name, shown in the player. */
  label: string;
};

const audio = (label: string): PlayableFormat => ({ engine: "audio", label });

/**
 * What a browser uploads a file as when it can't tell its type, as is common
 * for MIDI. Allowed only for formats that browsers often report so.
 */
const UNKNOWN_MIME_TYPE = "application/octet-stream";

/** Uncompressed MusicXML's own type, and the generic XML types browsers report it as. */
const MUSICXML_MIME_TYPE = "application/vnd.recordare.musicxml+xml";
const XML_MIME_TYPES = ["application/xml", "text/xml"];

const FILE_FORMATS: readonly FileFormat[] = [
  { extensions: [".pdf"], mimeTypes: ["application/pdf"] },
  { extensions: [".jpg", ".jpeg"], mimeTypes: ["image/jpeg"] },
  { extensions: [".png"], mimeTypes: ["image/png"] },
  { extensions: [".webp"], mimeTypes: ["image/webp"] },
  { extensions: [".gif"], mimeTypes: ["image/gif"] },
  { extensions: [".mp3"], mimeTypes: ["audio/mpeg", "audio/mp3"], playable: audio("MP3") },
  {
    extensions: [".m4a"],
    mimeTypes: ["audio/mp4", "audio/x-m4a", "audio/m4a", "audio/aac"],
    playable: audio("M4A"),
  },
  {
    extensions: [".aac"],
    mimeTypes: ["audio/aac", "audio/x-aac", "audio/aacp", "audio/x-hx-aac-adts"],
    playable: audio("AAC"),
  },
  {
    extensions: [".wav"],
    mimeTypes: ["audio/wav", "audio/x-wav", "audio/wave", "audio/vnd.wave"],
    playable: audio("WAV"),
  },
  {
    extensions: [".mid", ".midi"],
    mimeTypes: ["audio/midi", "audio/x-midi", "audio/mid", "application/x-midi", UNKNOWN_MIME_TYPE],
    playable: { engine: "midi", label: "MIDI" },
  },
  {
    extensions: [".musicxml"],
    mimeTypes: [MUSICXML_MIME_TYPE, ...XML_MIME_TYPES, UNKNOWN_MIME_TYPE],
    playable: { engine: "notation", label: "MusicXML" },
  },
  {
    extensions: [".xml"],
    mimeTypes: [...XML_MIME_TYPES, MUSICXML_MIME_TYPE, UNKNOWN_MIME_TYPE],
    playable: { engine: "notation", label: "MusicXML" },
  },
  {
    extensions: [".mxl"],
    mimeTypes: [
      "application/vnd.recordare.musicxml",
      "application/zip",
      "application/x-zip-compressed",
      UNKNOWN_MIME_TYPE,
    ],
    playable: { engine: "notation", label: "MXL" },
  },
];

/** The `accept` attribute for a file input that picks a File. */
export const FILE_INPUT_ACCEPT = FILE_FORMATS.flatMap((format) => format.extensions).join(",");

function extensionOf(fileName: string): string | null {
  const dot = fileName.lastIndexOf(".");
  return dot > 0 ? fileName.slice(dot).toLowerCase() : null;
}

function formatOf(fileName: string): FileFormat | undefined {
  const extension = extensionOf(fileName);
  return extension ? FILE_FORMATS.find((format) => format.extensions.includes(extension)) : undefined;
}

/** Whether a file with this name and MIME type may be uploaded as a File. */
export function isAllowedFile({ fileName, mimeType }: { fileName: string; mimeType: string }): boolean {
  return formatOf(fileName)?.mimeTypes.includes(mimeType) ?? false;
}

/** The File's format if it is a Playable File, which the player opens instead of downloading; otherwise `null`. */
export function playableFormatOf({ fileName }: { fileName: string }): PlayableFormat | null {
  return formatOf(fileName)?.playable ?? null;
}

/** The MIME type to upload a picked file as: what the browser reports, or a generic binary file when it reports nothing. */
export function uploadMimeType(file: Pick<File, "type">): string {
  return file.type || UNKNOWN_MIME_TYPE;
}
