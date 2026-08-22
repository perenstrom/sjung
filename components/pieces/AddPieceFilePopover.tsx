"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { usePieceFileTransfer } from "@/components/PieceLinksDialog/usePieceFileTransfer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { PIECE_FILE_ACCEPT_ATTR } from "@/lib/schemas/files";

export function AddPieceFilePopover({
  groupSlug,
  pieceId,
  pieceName,
  open: openControlled,
  disabled = false,
  onOpenChange: onOpenChangeExternal,
}: {
  groupSlug: string;
  pieceId: string;
  pieceName: string;
  open?: boolean;
  disabled?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const router = useRouter();
  const [openInternal, setOpenInternal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isControlled = openControlled !== undefined;
  const open = isControlled ? openControlled : openInternal;

  function handleOpenChange(nextOpen: boolean) {
    if (!isControlled) {
      setOpenInternal(nextOpen);
    }
    onOpenChangeExternal?.(nextOpen);
    if (!nextOpen) {
      setError(null);
    }
  }

  const { handleTransfer, isTransferring } = usePieceFileTransfer({
    target: { kind: "upload", groupSlug, pieceId },
    onError: (message) => setError(message),
    onClearError: () => setError(null),
    onTransferSuccess: () => {
      handleOpenChange(false);
      router.refresh();
    },
  });

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7 shrink-0"
          disabled={disabled}
          aria-label="Ladda upp fil"
        >
          <Plus className="size-4" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 space-y-4">
        <div className="space-y-1">
          <p className="text-sm font-medium">Ladda upp fil</p>
          <p className="text-sm text-muted-foreground">{pieceName}</p>
        </div>

        <form action={handleTransfer} className="space-y-4">
          <input type="hidden" name="groupSlug" value={groupSlug} />
          <input type="hidden" name="pieceId" value={pieceId} />

          <div className="space-y-2">
            <Label htmlFor={`add-file-${pieceId}`}>Välj fil</Label>
            <Input
              id={`add-file-${pieceId}`}
              name="file"
              type="file"
              accept={PIECE_FILE_ACCEPT_ATTR}
              required
              disabled={isTransferring}
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isTransferring}
            >
              Avbryt
            </Button>
            <Button type="submit" disabled={isTransferring}>
              {isTransferring ? "Laddar upp..." : "Ladda upp"}
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}
