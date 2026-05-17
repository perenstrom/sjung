"use client";

import { ExternalLink, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { removeLink, updateLink } from "@/app/actions/pieces";
import { AddPieceLinkPopover } from "@/components/pieces/AddPieceLinkPopover";
import { labelForLink } from "@/components/PieceLinksDialog/linkLabel";
import type { PieceLink } from "@/components/PieceLinksDialog/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getThrownMessage } from "@/lib/getThrownMessage";

export function PieceInlineLinksCell({
  groupSlug,
  pieceId,
  pieceName,
  links,
}: {
  groupSlug: string;
  pieceId: string;
  pieceName: string;
  links: PieceLink[];
}) {
  const router = useRouter();
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [addPopoverOpen, setAddPopoverOpen] = useState(false);
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  async function handleUpdate(formData: FormData) {
    try {
      await updateLink(formData);
      setEditingLinkId(null);
      setEditError(null);
      router.refresh();
    } catch (err) {
      setEditError(getThrownMessage(err, "Kunde inte spara länk"));
    }
  }

  async function handleRemove(formData: FormData) {
    try {
      await removeLink(formData);
      setRemoveError(null);
      router.refresh();
    } catch (err) {
      setRemoveError(getThrownMessage(err, "Kunde inte ta bort länk"));
    }
  }

  return (
    <div className="flex min-w-0 flex-1 items-start gap-2">
      <div className="min-w-0 flex-1 space-y-2">
        {links.length === 0 ? (
          <p className="text-sm text-muted-foreground">Inga länkar tillagda ännu.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {links.map((link) => (
              <li key={link.id} className="flex min-w-0 items-center gap-1">
                <ExternalLink
                  className="size-3.5 shrink-0 text-muted-foreground"
                  aria-hidden
                />
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 flex-1 truncate text-primary underline-offset-4 hover:underline"
                >
                  {labelForLink(link)}
                  <span className="sr-only">, öppnas i ny flik</span>
                </a>
                <Popover
                  open={editingLinkId === link.id}
                  onOpenChange={(nextOpen) => {
                    if (nextOpen) {
                      setAddPopoverOpen(false);
                      setEditingLinkId(link.id);
                      setEditError(null);
                    } else if (editingLinkId === link.id) {
                      setEditingLinkId(null);
                      setEditError(null);
                    }
                  }}
                >
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7 shrink-0"
                      disabled={addPopoverOpen}
                      aria-label={`Redigera länk ${labelForLink(link)}`}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-80 space-y-4">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Redigera länk</p>
                      <p className="text-sm text-muted-foreground">{pieceName}</p>
                    </div>

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
                          <Label htmlFor={`edit-label-${link.id}`}>
                            Etikett (valfritt)
                          </Label>
                          <Input
                            id={`edit-label-${link.id}`}
                            name="label"
                            defaultValue={link.label ?? ""}
                          />
                        </div>
                      </div>

                      {editError && editingLinkId === link.id ? (
                        <p className="text-sm text-destructive">{editError}</p>
                      ) : null}

                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setEditingLinkId(null)}
                        >
                          Avbryt
                        </Button>
                        <Button type="submit">Spara</Button>
                      </div>
                    </form>
                  </PopoverContent>
                </Popover>
                <form action={handleRemove}>
                  <input type="hidden" name="groupSlug" value={groupSlug} />
                  <input type="hidden" name="linkId" value={link.id} />
                  <Button
                    type="submit"
                    variant="ghost"
                    size="icon"
                    className="size-7 shrink-0"
                    disabled={addPopoverOpen || editingLinkId !== null}
                    aria-label={`Ta bort länk ${labelForLink(link)}`}
                  >
                    <Trash2 className="size-3.5" aria-hidden="true" />
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}

        {removeError ? (
          <p className="text-sm text-destructive">{removeError}</p>
        ) : null}
      </div>

      <AddPieceLinkPopover
        groupSlug={groupSlug}
        pieceId={pieceId}
        pieceName={pieceName}
        open={addPopoverOpen}
        disabled={editingLinkId !== null}
        onOpenChange={(nextOpen) => {
          setAddPopoverOpen(nextOpen);
          if (nextOpen) {
            setEditingLinkId(null);
            setEditError(null);
          }
        }}
      />
    </div>
  );
}
