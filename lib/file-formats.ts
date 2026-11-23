/**
 * The formats a File may have. A file's format comes from its extension;
 * each format lists the MIME types a browser may report for it, since
 * browsers report some formats inconsistently. No byte sniffing.
 */
type FileFormat = {
  extensions: readonly string[];
  mimeTypes: readonly string[];
  /** Whether a File of this format is a Playable File (see CONTEXT.md). */
  playable: boolean;
};

const FILE_FORMATS: readonly FileFormat[] = [
  { extensions: [".pdf"], mimeTypes: ["application/pdf"], playable: false },
  { extensions: [".jpg", ".jpeg"], mimeTypes: ["image/jpeg"], playable: false },
  { extensions: [".png"], mimeTypes: ["image/png"], playable: false },
  { extensions: [".webp"], mimeTypes: ["image/webp"], playable: false },
  { extensions: [".gif"], mimeTypes: ["image/gif"], playable: false },
  { extensions: [".mp3"], mimeTypes: ["audio/mpeg", "audio/mp3"], playable: true },
  {
    extensions: [".m4a"],
    mimeTypes: ["audio/mp4", "audio/x-m4a", "audio/m4a", "audio/aac"],
    playable: true,
  },
  {
    extensions: [".aac"],
    mimeTypes: ["audio/aac", "audio/x-aac", "audio/aacp", "audio/x-hx-aac-adts"],
    playable: true,
  },
  {
    extensions: [".wav"],
    mimeTypes: ["audio/wav", "audio/x-wav", "audio/wave", "audio/vnd.wave"],
    playable: true,
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

/** Whether the File is a Playable File, which the player opens instead of downloading. */
export function isPlayableFile({ fileName }: { fileName: string }): boolean {
  return formatOf(fileName)?.playable ?? false;
}
