"use client";

import { useState } from "react";
import { addLink, removeLink } from "@/app/actions/pieces";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PieceLink = {
  id: string;
  url: string;
  label: string | null;
};

type Piece = {
  id: string;
  name: string;
  links: PieceLink[];
};

function labelForLink(link: PieceLink): string {
  if (link.label && link.label.trim() !== "") {
    return link.label;
  }

  try {
    return new URL(link.url).hostname || link.url;
  } catch {
    return link.url;
  }
}

export function PieceLinksDialog({
  groupSlug,
  piece,
}: {
  groupSlug: string;
  piece: Piece;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(formData: FormData) {
    try {
      await addLink(formData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunde inte lägga till länk");
    }
  }

  async function handleRemove(formData: FormData) {
    try {
      await removeLink(formData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunde inte ta bort länk");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Länkar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Länkar för {piece.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <form action={handleAdd} className="space-y-3">
            <input type="hidden" name="groupSlug" value={groupSlug} />
            <input type="hidden" name="pieceId" value={piece.id} />
            <div className="space-y-2">
              <Label htmlFor={`url-${piece.id}`}>Länk</Label>
              <Input id={`url-${piece.id}`} name="url" type="url" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`label-${piece.id}`}>Etikett (valfritt)</Label>
              <Input id={`label-${piece.id}`} name="label" />
            </div>
            <div className="flex justify-end">
              <Button type="submit">Lägg till länk</Button>
            </div>
          </form>

          <div className="space-y-2">
            <h3 className="text-sm font-medium">Befintliga länkar</h3>
            {piece.links.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Inga länkar tillagda ännu.
              </p>
            ) : (
              <ul className="space-y-2">
                {piece.links.map((link) => (
                  <li
                    key={link.id}
                    className="flex items-center justify-between gap-2 rounded border p-2"
                  >
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate text-sm text-primary underline-offset-4 hover:underline"
                    >
                      {labelForLink(link)}
                    </a>
                    <form action={handleRemove}>
                      <input type="hidden" name="groupSlug" value={groupSlug} />
                      <input type="hidden" name="linkId" value={link.id} />
                      <Button type="submit" variant="ghost" size="sm">
                        Ta bort
                      </Button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
