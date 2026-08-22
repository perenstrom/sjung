"use client";

import { Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { updatePieceFileDisplayName } from "@/app/actions/files";
import { AddPieceFilePopover } from "@/components/pieces/AddPieceFilePopover";
import {
  PieceFilesList,
  type PieceFileListItem,
} from "@/components/PieceLinksDialog/PieceFilesList";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getThrownMessage } from "@/lib/getThrownMessage";

export type PieceInlineFile = PieceFileListItem;

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
  const [error, setError] = useState<string | null>(null);
  const [addPopoverOpen, setAddPopoverOpen] = useState(false);
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

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

  return (
    <div className="flex min-w-0 flex-1 items-start gap-2">
      <div className="min-w-0 flex-1 space-y-2">
        <PieceFilesList
          groupSlug={groupSlug}
          files={files}
          showUploadedAt={false}
          onAggregateError={setError}
          onClearAggregateError={() => setError(null)}
          onMutationSuccess={() => router.refresh()}
          disabled={addPopoverOpen || editingFileId !== null}
          renderFileActions={(file) => (
            <Popover
              key={file.id}
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
                  disabled={addPopoverOpen}
                  aria-label={`Redigera filnamn ${file.displayName}`}
                >
                  <Pencil className="size-3.5" aria-hidden="true" />
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

                  {editError ? (
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
          )}
        />

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
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
