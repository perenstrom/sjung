/**
 * The one File to upload from a drop. Several Files at once are refused
 * until multi-file upload exists; a drop without Files (e.g. text) is ignored.
 */
export function pickDroppedFile(
  files: ArrayLike<File>,
): { file: File } | { error: string } | null {
  if (files.length === 0) {
    return null;
  }
  if (files.length > 1) {
    return { error: "Släpp en fil i taget." };
  }
  return { file: files[0] };
}
