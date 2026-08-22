"use client";

import { RefreshCw } from "lucide-react";
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

export function ReplacePieceFilePopover({
  groupSlug,
  fileId,
  displayName,
  pieceName,
  open: openControlled,
  disabled = false,
  onOpenChange: onOpenChangeExternal,
  onReplaceSuccess,
  triggerClassName,
  triggerSize = "icon",
}: {
  groupSlug: string;
  fileId: string;
  displayName: string;
  pieceName?: string;
  open?: boolean;
  disabled?: boolean;
  onOpenChange?: (open: boolean) => void;
  onReplaceSuccess?: () => void;
  triggerClassName?: string;
  triggerSize?: "icon" | "sm";
}) {
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
    target: { kind: "replace", groupSlug, fileId },
    onError: (message) => setError(message),
    onClearError: () => setError(null),
    onTransferSuccess: () => {
      handleOpenChange(false);
      onReplaceSuccess?.();
    },
  });

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size={triggerSize}
          className={triggerClassName}
          disabled={disabled}
          aria-label={`Ersätt fil ${displayName}`}
        >
          <RefreshCw className="size-3.5" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 space-y-4">
        <div className="space-y-1">
          <p className="text-sm font-medium">Ersätt fil</p>
          {pieceName ? (
            <p className="text-sm text-muted-foreground">{pieceName}</p>
          ) : (
            <p className="text-sm text-muted-foreground">{displayName}</p>
          )}
        </div>

        <form action={handleTransfer} className="space-y-4">
          <input type="hidden" name="groupSlug" value={groupSlug} />
          <input type="hidden" name="fileId" value={fileId} />

          <div className="space-y-2">
            <Label htmlFor={`replace-file-${fileId}`}>Välj ny fil</Label>
            <Input
              id={`replace-file-${fileId}`}
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
              {isTransferring ? "Ersätter..." : "Ersätt"}
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}
