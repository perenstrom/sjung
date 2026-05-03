"use client";

import { useState } from "react";
import {
  createPieceFileDownloadUrl,
  createPieceFileUploadUrl,
  deletePieceFile,
  finalizePieceFileUpload,
} from "@/app/actions/files";
import { addLink, removeLink } from "@/app/actions/pieces";
import { getThrownMessage } from "@/lib/getThrownMessage";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PieceLink = {
  id: string;
  url: string;
  label: string | null;
};

type PieceFile = {
  id: string;
  displayName: string;
  size: number;
};

type Piece = {
  id: string;
  name: string;
  files: PieceFile[];
  links: PieceLink[];
};

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function labelForLink(link: PieceLink): string {
  if (link.label && link.label.trim() !== "") {
    return link.label;
  }

  try {
    return new URL(link.url).hostname || link.url;
  } catch {
    return link.url;
  }
}

function formatFileSize(size: number): string {
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function PieceLinksDialog({
  groupSlug,
  piece,
}: {
  groupSlug: string;
  piece: Piece;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);
  const [deleteErrors, setDeleteErrors] = useState<Record<string, string>>({});

  async function handleAdd(formData: FormData) {
    try {
      await addLink(formData);
      setError(null);
    } catch (err) {
      setError(getThrownMessage(err, "Kunde inte lägga till länk"));
    }
  }

  async function handleRemove(formData: FormData) {
    try {
      await removeLink(formData);
      setError(null);
    } catch (err) {
      setError(getThrownMessage(err, "Kunde inte ta bort länk"));
    }
  }

  async function handleUpload(formData: FormData) {
    const selectedFile = formData.get("file");
    if (!(selectedFile instanceof File)) {
      setError("Välj en fil att ladda upp");
      return;
    }

    if (!ALLOWED_MIME_TYPES.has(selectedFile.type)) {
      setError("Filtypen stöds inte");
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
      setError("Filen är för stor (max 50 MB)");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const uploadMeta = new FormData();
      uploadMeta.set("groupSlug", groupSlug);
      uploadMeta.set("pieceId", piece.id);
      uploadMeta.set("fileName", selectedFile.name);
      uploadMeta.set("mimeType", selectedFile.type);
      uploadMeta.set("size", String(selectedFile.size));

      const uploadData = await createPieceFileUploadUrl(uploadMeta);
      const uploadResponse = await fetch(uploadData.uploadUrl, {
        method: "PUT",
        headers: uploadData.headers,
        body: selectedFile,
      });

      if (!uploadResponse.ok) {
        throw new Error("Kunde inte ladda upp filen");
      }

      const finalizeData = new FormData();
      finalizeData.set("groupSlug", groupSlug);
      finalizeData.set("pieceId", piece.id);
      finalizeData.set("fileName", selectedFile.name);
      finalizeData.set("storagePath", uploadData.storagePath);
      finalizeData.set("mimeType", selectedFile.type);
      finalizeData.set("size", String(selectedFile.size));
      finalizeData.set("displayName", selectedFile.name);
      await finalizePieceFileUpload(finalizeData);
    } catch (err) {
      setError(getThrownMessage(err, "Kunde inte ladda upp fil"));
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDownload(fileId: string) {
    setDownloadingFileId(fileId);
    setError(null);

    try {
      const formData = new FormData();
      formData.set("groupSlug", groupSlug);
      formData.set("fileId", fileId);
      const { downloadUrl } = await createPieceFileDownloadUrl(formData);
      window.open(downloadUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(getThrownMessage(err, "Kunde inte ladda ner fil"));
    } finally {
      setDownloadingFileId(null);
    }
  }

  async function handleDeleteFile(fileId: string) {
    setDeletingFileId(fileId);
    setError(null);
    setDeleteErrors((prev) => {
      const next = { ...prev };
      delete next[fileId];
      return next;
    });

    try {
      const formData = new FormData();
      formData.set("groupSlug", groupSlug);
      formData.set("fileId", fileId);
      await deletePieceFile(formData);
    } catch (err) {
      const message = getThrownMessage(err, "Kunde inte ta bort fil");
      setDeleteErrors((prev) => ({ ...prev, [fileId]: message }));
    } finally {
      setDeletingFileId(null);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setError(null);
          setDeleteErrors({});
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Länkar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Länkar och filer för {piece.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-3 rounded border p-3">
            <h3 className="text-sm font-medium">Filer</h3>
            <form action={handleUpload} className="space-y-3">
              <input type="hidden" name="groupSlug" value={groupSlug} />
              <input type="hidden" name="pieceId" value={piece.id} />
              <div className="space-y-2">
                <Label htmlFor={`file-${piece.id}`}>Välj fil</Label>
                <Input
                  id={`file-${piece.id}`}
                  name="file"
                  type="file"
                  accept=".pdf,image/jpeg,image/png,image/webp,image/gif"
                  required
                  disabled={isUploading}
                />
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={isUploading}>
                  {isUploading ? "Laddar upp..." : "Ladda upp fil"}
                </Button>
              </div>
            </form>

            {piece.files.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Inga filer uppladdade ännu.
              </p>
            ) : (
              <ul className="space-y-2">
                {piece.files.map((file) => {
                  const deleteError = deleteErrors[file.id];
                  return (
                    <li key={file.id} className="space-y-2 rounded border p-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {file.displayName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownload(file.id)}
                            disabled={
                              downloadingFileId === file.id ||
                              deletingFileId === file.id
                            }
                          >
                            {downloadingFileId === file.id
                              ? "Hämtar..."
                              : "Ladda ner"}
                          </Button>
                          <Button
                            type="button"
                            variant={deleteError ? "destructive" : "ghost"}
                            size="sm"
                            onClick={() => handleDeleteFile(file.id)}
                            disabled={deletingFileId === file.id}
                          >
                            {deletingFileId === file.id
                              ? "Tar bort..."
                              : deleteError
                                ? "Försök igen"
                                : "Ta bort"}
                          </Button>
                        </div>
                      </div>
                      {deleteError ? (
                        <p className="text-xs text-destructive">{deleteError}</p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <form action={handleAdd} className="space-y-3 rounded border p-3">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Länkar</h3>
            </div>
            <input type="hidden" name="groupSlug" value={groupSlug} />
            <input type="hidden" name="pieceId" value={piece.id} />
            <div className="space-y-2">
              <Label htmlFor={`url-${piece.id}`}>Länk</Label>
              <Input id={`url-${piece.id}`} name="url" type="url" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`label-${piece.id}`}>Etikett (valfritt)</Label>
              <Input id={`label-${piece.id}`} name="label" />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={isUploading}>
                Lägg till länk
              </Button>
            </div>
          </form>

          <div className="space-y-2">
            <h3 className="text-sm font-medium">Befintliga länkar</h3>
            {piece.links.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Inga länkar tillagda ännu.
              </p>
            ) : (
              <ul className="space-y-2">
                {piece.links.map((link) => (
                  <li
                    key={link.id}
                    className="flex items-center justify-between gap-2 rounded border p-2"
                  >
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate text-sm text-primary underline-offset-4 hover:underline"
                    >
                      {labelForLink(link)}
                    </a>
                    <form action={handleRemove}>
                      <input type="hidden" name="groupSlug" value={groupSlug} />
                      <input type="hidden" name="linkId" value={link.id} />
                      <Button type="submit" variant="ghost" size="sm">
                        Ta bort
                      </Button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
