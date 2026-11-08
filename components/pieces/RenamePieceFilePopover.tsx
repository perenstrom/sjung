"use client";

import { Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { updatePieceFileDisplayName } from "@/app/actions/files";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FormPopover,
  FormPopoverContent,
  FormPopoverFooter,
  FormPopoverTrigger,
} from "@/components/ui/form-popover";
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
    <FormPopover open={open} onOpenChange={handleOpenChange}>
      <FormPopoverTrigger asChild>
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
      </FormPopoverTrigger>
      <FormPopoverContent
        title="Redigera filnamn"
        description={pieceName ?? displayName}
      >
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

          <FormPopoverFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Avbryt
            </Button>
            <Button type="submit">Spara</Button>
          </FormPopoverFooter>
        </form>
      </FormPopoverContent>
    </FormPopover>
  );
}
