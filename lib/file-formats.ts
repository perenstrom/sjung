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

/** A Playable File's format, as the player needs it. */
export type PlayableFormat = {
  /** Which player engine plays it. */
  engine: "audio";
  /** The format's name, shown in the player. */
  label: string;
};

const audio = (label: string): PlayableFormat => ({ engine: "audio", label });

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
