"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useControllableOpen } from "@/hooks/use-controllable-open";

import { addLink } from "@/app/actions/pieces";
import { LinkPlus } from "@/components/pieces/LinkPlus";
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
  const [error, setError] = useState<string | null>(null);
  const { open, setOpen: handleOpenChange } = useControllableOpen({
    open: openControlled,
    onOpenChange: onOpenChangeExternal,
    onClose: () => setError(null),
  });

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
    <FormPopover open={open} onOpenChange={handleOpenChange}>
      <FormPopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7 shrink-0"
          disabled={disabled}
          aria-label="Lägg till länk"
        >
          <LinkPlus className="size-4" aria-hidden="true" />
        </Button>
      </FormPopoverTrigger>
      <FormPopoverContent title="Lägg till länk" description={pieceName}>
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

          <FormPopoverFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Avbryt
            </Button>
            <Button type="submit">Lägg till</Button>
          </FormPopoverFooter>
        </form>
      </FormPopoverContent>
    </FormPopover>
  );
}
