"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { usePieceFileTransfer } from "@/components/pieces/usePieceFileTransfer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FormPopover,
  FormPopoverContent,
  FormPopoverFooter,
  FormPopoverTrigger,
} from "@/components/ui/form-popover";
import { Spinner } from "@/components/ui/spinner";
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
    <FormPopover
      open={open}
      onOpenChange={(nextOpen) => {
        // Keep the form open mid-transfer so its outcome stays visible.
        if (!nextOpen && isTransferring) {
          return;
        }
        handleOpenChange(nextOpen);
      }}
    >
      <FormPopoverTrigger asChild>
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
      </FormPopoverTrigger>
      <FormPopoverContent title="Ladda upp fil" description={pieceName}>
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

          <FormPopoverFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isTransferring}
            >
              Avbryt
            </Button>
            <Button type="submit" disabled={isTransferring}>
              {isTransferring ? (
                <>
                  <Spinner />
                  Laddar upp...
                </>
              ) : (
                "Ladda upp"
              )}
            </Button>
          </FormPopoverFooter>
        </form>
      </FormPopoverContent>
    </FormPopover>
  );
}
