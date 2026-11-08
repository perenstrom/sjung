"use client";

import { Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { updateLink } from "@/app/actions/pieces";
import { labelForLink } from "@/components/pieces/linkLabel";
import type { PieceLink } from "@/components/pieces/types";
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

export function EditPieceLinkPopover({
  groupSlug,
  link,
  pieceName,
  open,
  disabled = false,
  onOpenChange,
  triggerClassName,
}: {
  groupSlug: string;
  link: PieceLink;
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
      await updateLink(formData);
      handleOpenChange(false);
      router.refresh();
    } catch (err) {
      setError(getThrownMessage(err, "Kunde inte spara länk"));
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
          aria-label={`Redigera länk ${labelForLink(link)}`}
        >
          <Pencil className="size-3.5" aria-hidden="true" />
        </Button>
      </FormPopoverTrigger>
      <FormPopoverContent
        title="Redigera länk"
        description={pieceName ?? labelForLink(link)}
      >
        <form action={handleUpdate} className="space-y-4">
          <input type="hidden" name="groupSlug" value={groupSlug} />
          <input type="hidden" name="linkId" value={link.id} />

          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor={`edit-url-${link.id}`}>Länk</Label>
              <Input
                id={`edit-url-${link.id}`}
                name="url"
                type="url"
                defaultValue={link.url}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`edit-label-${link.id}`}>Etikett (valfritt)</Label>
              <Input
                id={`edit-label-${link.id}`}
                name="label"
                defaultValue={link.label ?? ""}
              />
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
            <Button type="submit">Spara</Button>
          </FormPopoverFooter>
        </form>
      </FormPopoverContent>
    </FormPopover>
  );
}
