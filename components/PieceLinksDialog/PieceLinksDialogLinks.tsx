"use client";

import { addLink, removeLink } from "@/app/actions/pieces";
import { getThrownMessage } from "@/lib/getThrownMessage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { labelForLink } from "./linkLabel";
import type { Piece } from "./types";

export function PieceLinksDialogLinks({
  groupSlug,
  piece,
  uploadsInProgress,
  onAggregateError,
  onClearAggregateError,
  onMutationSuccess,
}: {
  groupSlug: string;
  piece: Pick<Piece, "id" | "links">;
  uploadsInProgress: boolean;
  onAggregateError: (message: string) => void;
  onClearAggregateError: () => void;
  onMutationSuccess?: () => void;
}) {
  async function handleAdd(formData: FormData) {
    try {
      await addLink(formData);
      onClearAggregateError();
      onMutationSuccess?.();
    } catch (err) {
      onAggregateError(getThrownMessage(err, "Kunde inte lägga till länk"));
    }
  }

  async function handleRemove(formData: FormData) {
    try {
      await removeLink(formData);
      onClearAggregateError();
      onMutationSuccess?.();
    } catch (err) {
      onAggregateError(getThrownMessage(err, "Kunde inte ta bort länk"));
    }
  }

  return (
    <>
      <form action={handleAdd} className="space-y-3 rounded border p-3">
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Länkar</h3>
        </div>
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
          <Button type="submit" disabled={uploadsInProgress}>
            Lägg till länk
          </Button>
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
    </>
  );
}
