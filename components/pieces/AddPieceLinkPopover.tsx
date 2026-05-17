"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { addLink } from "@/app/actions/pieces";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getThrownMessage } from "@/lib/getThrownMessage";

export function AddPieceLinkPopover({
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

  async function handleSubmit(formData: FormData) {
    try {
      await addLink(formData);
      handleOpenChange(false);
      router.refresh();
    } catch (err) {
      setError(getThrownMessage(err, "Kunde inte lägga till länk"));
    }
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7 shrink-0"
          disabled={disabled}
          aria-label="Lägg till länk"
        >
          <Plus className="size-4" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 space-y-4">
        <div className="space-y-1">
          <p className="text-sm font-medium">Lägg till länk</p>
          <p className="text-sm text-muted-foreground">{pieceName}</p>
        </div>

        <form action={handleSubmit} className="space-y-4">
          <input type="hidden" name="groupSlug" value={groupSlug} />
          <input type="hidden" name="pieceId" value={pieceId} />

          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor={`add-url-${pieceId}`}>Länk</Label>
              <Input id={`add-url-${pieceId}`} name="url" type="url" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`add-label-${pieceId}`}>Etikett (valfritt)</Label>
              <Input id={`add-label-${pieceId}`} name="label" />
            </div>
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
            <Button type="submit">Lägg till</Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}
