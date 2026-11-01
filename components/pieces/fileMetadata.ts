import type { PieceFileListItem } from "@/components/pieces/types";
import { formatFileSize } from "@/lib/formatFileSize";

function formatUploadedDate(value: Date | string): string {
  return new Intl.DateTimeFormat("sv-SE", { dateStyle: "medium" }).format(
    new Date(value),
  );
}

/** Size · upload date, shown next to a File's name. */
export function metadataForFile(file: PieceFileListItem): string {
  const size = formatFileSize(file.size);
  return file.createdAt == null
    ? size
    : `${size} · ${formatUploadedDate(file.createdAt)}`;
}
