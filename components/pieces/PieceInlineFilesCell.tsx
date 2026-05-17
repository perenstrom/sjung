"use client";

import { FileText, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  createPieceFileDownloadUrl,
  deletePieceFile,
  updatePieceFileDisplayName,
} from "@/app/actions/files";
import { AddPieceFilePopover } from "@/components/pieces/AddPieceFilePopover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getThrownMessage } from "@/lib/getThrownMessage";

export type PieceInlineFile = {
  id: string;
  displayName: string;
};

export function PieceInlineFilesCell({
  groupSlug,
  pieceId,
  pieceName,
  files,
}: {
  groupSlug: string;
  pieceId: string;
  pieceName: string;
  files: PieceInlineFile[];
}) {
  const router = useRouter();
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);
  const [addPopoverOpen, setAddPopoverOpen] = useState(false);
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  async function handleDownload(fileId: string) {
    setDownloadingFileId(fileId);
    setDownloadError(null);

    try {
      const formData = new FormData();
      formData.set("groupSlug", groupSlug);
      formData.set("fileId", fileId);
      const { downloadUrl } = await createPieceFileDownloadUrl(formData);
      window.open(downloadUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      setDownloadError(getThrownMessage(err, "Kunde inte ladda ner fil"));
    } finally {
      setDownloadingFileId(null);
    }
  }

  async function handleUpdate(formData: FormData) {
    try {
      await updatePieceFileDisplayName(formData);
      setEditingFileId(null);
      setEditError(null);
      router.refresh();
    } catch (err) {
      setEditError(getThrownMessage(err, "Kunde inte spara filnamn"));
    }
  }

  async function handleRemove(formData: FormData) {
    try {
      await deletePieceFile(formData);
      setRemoveError(null);
      router.refresh();
    } catch (err) {
      setRemoveError(getThrownMessage(err, "Kunde inte ta bort fil"));
    }
  }

  return (
    <div className="flex min-w-0 flex-1 items-start gap-2">
      <div className="min-w-0 flex-1 space-y-2">
        {files.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Inga filer uppladdade ännu.
          </p>
        ) : (
          <ul className="space-y-2 text-sm">
            {files.map((file) => (
              <li key={file.id} className="flex min-w-0 items-center gap-1">
                <FileText
                  className="size-3.5 shrink-0 text-muted-foreground"
                  aria-hidden
                />
                <button
                  type="button"
                  onClick={() => handleDownload(file.id)}
                  disabled={
                    downloadingFileId === file.id ||
                    addPopoverOpen ||
                    editingFileId !== null
                  }
                  className="min-w-0 flex-1 truncate text-left text-primary underline-offset-4 hover:underline disabled:opacity-50"
                >
                  {downloadingFileId === file.id
                    ? "Hämtar..."
                    : file.displayName}
                </button>
                <Popover
                  open={editingFileId === file.id}
                  onOpenChange={(nextOpen) => {
                    if (nextOpen) {
                      setAddPopoverOpen(false);
                      setEditingFileId(file.id);
                      setEditError(null);
                    } else if (editingFileId === file.id) {
                      setEditingFileId(null);
                      setEditError(null);
                    }
                  }}
                >
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7 shrink-0"
                      disabled={addPopoverOpen}
                      aria-label={`Redigera filnamn ${file.displayName}`}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-80 space-y-4">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Redigera filnamn</p>
                      <p className="text-sm text-muted-foreground">{pieceName}</p>
                    </div>

                    <form action={handleUpdate} className="space-y-4">
                      <input type="hidden" name="groupSlug" value={groupSlug} />
                      <input type="hidden" name="fileId" value={file.id} />

                      <div className="space-y-2">
                        <Label htmlFor={`edit-display-name-${file.id}`}>
                          Visningsnamn
                        </Label>
                        <Input
                          id={`edit-display-name-${file.id}`}
                          name="displayName"
                          defaultValue={file.displayName}
                          required
                        />
                      </div>

                      {editError && editingFileId === file.id ? (
                        <p className="text-sm text-destructive">{editError}</p>
                      ) : null}

                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setEditingFileId(null)}
                        >
                          Avbryt
                        </Button>
                        <Button type="submit">Spara</Button>
                      </div>
                    </form>
                  </PopoverContent>
                </Popover>
                <form action={handleRemove}>
                  <input type="hidden" name="groupSlug" value={groupSlug} />
                  <input type="hidden" name="fileId" value={file.id} />
                  <Button
                    type="submit"
                    variant="ghost"
                    size="icon"
                    className="size-7 shrink-0"
                    disabled={addPopoverOpen || editingFileId !== null}
                    aria-label={`Ta bort fil ${file.displayName}`}
                  >
                    <Trash2 className="size-3.5" aria-hidden="true" />
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}

        {removeError ? (
          <p className="text-sm text-destructive">{removeError}</p>
        ) : null}
        {downloadError ? (
          <p className="text-sm text-destructive">{downloadError}</p>
        ) : null}
      </div>

      <AddPieceFilePopover
        groupSlug={groupSlug}
        pieceId={pieceId}
        pieceName={pieceName}
        open={addPopoverOpen}
        disabled={editingFileId !== null}
        onOpenChange={(nextOpen) => {
          setAddPopoverOpen(nextOpen);
          if (nextOpen) {
            setEditingFileId(null);
            setEditError(null);
          }
        }}
      />
    </div>
  );
}
