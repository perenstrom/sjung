"use client";

import { Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, type DragEvent } from "react";

import { pickDroppedFile } from "@/components/pieces/droppedFile";
import { usePieceFileTransfer } from "@/components/pieces/usePieceFileTransfer";
import { Button } from "@/components/ui/button";
import { PIECE_FILE_ACCEPT_ATTR } from "@/lib/schemas/files";
import { cn } from "@/lib/utils";

/**
 * Always-visible drop zone for uploading one File to a Piece. The upload
 * starts as soon as a File is dropped or picked.
 */
export function AddPieceFileRow({
  groupSlug,
  pieceId,
}: {
  groupSlug: string;
  pieceId: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { handleTransfer, isTransferring } = usePieceFileTransfer({
    target: { kind: "upload", groupSlug, pieceId },
    onError: setError,
    onClearError: () => setError(null),
    onTransferSuccess: () => router.refresh(),
  });

  async function upload(file: File) {
    const formData = new FormData();
    formData.set("file", file);
    await handleTransfer(formData);
    // Reset so picking the same File again still fires a change.
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    // Only File drags are ours; leave dragged text and links alone.
    if (!event.dataTransfer.types.includes("Files")) {
      return;
    }
    // Claim the drop even mid-upload, so the browser doesn't open the File.
    event.preventDefault();
    event.dataTransfer.dropEffect = isTransferring ? "none" : "copy";
    if (!isTransferring) {
      setIsDragOver(true);
    }
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    // Moving over a child fires dragleave on the zone; only react to leaving it.
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setIsDragOver(false);
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragOver(false);
    if (isTransferring) {
      return;
    }

    const dropped = pickDroppedFile(event.dataTransfer.files);
    if (dropped === null) {
      return;
    }
    if ("error" in dropped) {
      setError(dropped.error);
      return;
    }
    void upload(dropped.file);
  }

  return (
    <div className="space-y-2">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "flex flex-wrap items-center justify-center gap-2 rounded-md border border-dashed px-3 py-4 text-sm text-muted-foreground",
          isDragOver && "border-primary bg-primary/5",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={PIECE_FILE_ACCEPT_ATTR}
          aria-label="Fil"
          className="hidden"
          disabled={isTransferring}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              void upload(file);
            }
          }}
        />
        <Upload className="size-4" aria-hidden="true" />
        {isTransferring ? (
          <span>Laddar upp…</span>
        ) : (
          <>
            <span>Släpp en fil här eller</span>
            <Button
              type="button"
              variant="link"
              className="h-auto p-0"
              onClick={() => inputRef.current?.click()}
            >
              välj fil
            </Button>
          </>
        )}
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
