"use client";

import { RefreshCw } from "lucide-react";
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
          size={triggerSize}
          className={triggerClassName}
          disabled={disabled}
          aria-label={`Ersätt fil ${displayName}`}
        >
          <RefreshCw className="size-3.5" aria-hidden="true" />
        </Button>
      </FormPopoverTrigger>
      <FormPopoverContent
        title="Ersätt fil"
        description={pieceName ?? displayName}
      >
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
                  Ersätter...
                </>
              ) : (
                "Ersätt"
              )}
            </Button>
          </FormPopoverFooter>
        </form>
      </FormPopoverContent>
    </FormPopover>
  );
}
