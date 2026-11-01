"use client";

import { Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { updatePieceFileDisplayName } from "@/app/actions/files";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getThrownMessage } from "@/lib/getThrownMessage";

export function RenamePieceFilePopover({
  groupSlug,
  fileId,
  displayName,
  pieceName,
  open,
  disabled = false,
  onOpenChange,
  triggerClassName,
}: {
  groupSlug: string;
  fileId: string;
  displayName: string;
  pieceName?: string;
  open: boolean;
  disabled?: boolean;
  onOpenChange: (open: boolean) => void;
  triggerClassName?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  function handleOpenChange(nextOpen: boolean) {
    onOpenChange(nextOpen);
    if (!nextOpen) {
      setError(null);
    }
  }

  async function handleUpdate(formData: FormData) {
    try {
      await updatePieceFileDisplayName(formData);
      handleOpenChange(false);
      router.refresh();
    } catch (err) {
      setError(getThrownMessage(err, "Kunde inte spara filnamn"));
    }
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={triggerClassName}
          disabled={disabled}
          aria-label={`Redigera filnamn ${displayName}`}
        >
          <Pencil className="size-3.5" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 space-y-4">
        <div className="space-y-1">
          <p className="text-sm font-medium">Redigera filnamn</p>
          <p className="text-sm text-muted-foreground">
            {pieceName ?? displayName}
          </p>
        </div>

        <form action={handleUpdate} className="space-y-4">
          <input type="hidden" name="groupSlug" value={groupSlug} />
          <input type="hidden" name="fileId" value={fileId} />

          <div className="space-y-2">
            <Label htmlFor={`edit-display-name-${fileId}`}>Visningsnamn</Label>
            <Input
              id={`edit-display-name-${fileId}`}
              name="displayName"
              defaultValue={displayName}
              required
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Avbryt
            </Button>
            <Button type="submit">Spara</Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}
