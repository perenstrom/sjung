"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

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
import { PIECE_FILE_ACCEPT_ATTR } from "@/lib/schemas/files";

import { PieceFilesList } from "./PieceFilesList";
import type { Piece } from "./types";
import { usePieceFileTransfer } from "./usePieceFileTransfer";

export function PieceLinksDialog({
  groupSlug,
  piece,
  refreshAfterMutations = false,
}: {
  groupSlug: string;
  piece: Piece;
  refreshAfterMutations?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleMutationSuccess = useCallback(() => {
    if (refreshAfterMutations) {
      router.refresh();
    }
  }, [refreshAfterMutations, router]);

  const { handleTransfer, isTransferring } = usePieceFileTransfer({
    target: { kind: "upload", groupSlug, pieceId: piece.id },
    onError: setError,
    onClearError: () => setError(null),
    onTransferSuccess: handleMutationSuccess,
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="shrink-0">
          Filer
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Filer för {piece.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-3 rounded border p-3">
            <h3 className="text-sm font-medium">Filer</h3>
            <form action={handleTransfer} className="space-y-3">
              <input type="hidden" name="groupSlug" value={groupSlug} />
              <input type="hidden" name="pieceId" value={piece.id} />
              <div className="space-y-2">
                <Label htmlFor={`file-${piece.id}`}>Välj fil</Label>
                <Input
                  id={`file-${piece.id}`}
                  name="file"
                  type="file"
                  accept={PIECE_FILE_ACCEPT_ATTR}
                  required
                  disabled={isTransferring}
                />
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={isTransferring}>
                  {isTransferring ? "Laddar upp..." : "Ladda upp fil"}
                </Button>
              </div>
            </form>

            <PieceFilesList
              key={String(open)}
              groupSlug={groupSlug}
              files={piece.files}
              showUploadedAt={false}
              onAggregateError={setError}
              onClearAggregateError={() => setError(null)}
              onMutationSuccess={handleMutationSuccess}
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
