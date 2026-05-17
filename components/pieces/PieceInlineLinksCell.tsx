"use client";

import { ExternalLink, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { addLink, removeLink, updateLink } from "@/app/actions/pieces";
import { labelForLink } from "@/components/PieceLinksDialog/linkLabel";
import type { PieceLink } from "@/components/PieceLinksDialog/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getThrownMessage } from "@/lib/getThrownMessage";

export function PieceInlineLinksCell({
  groupSlug,
  pieceId,
  links,
}: {
  groupSlug: string;
  pieceId: string;
  links: PieceLink[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);

  async function refreshAfterMutation() {
    setError(null);
    router.refresh();
  }

  async function handleAdd(formData: FormData) {
    try {
      await addLink(formData);
      setShowAddForm(false);
      await refreshAfterMutation();
    } catch (err) {
      setError(getThrownMessage(err, "Kunde inte lägga till länk"));
    }
  }

  async function handleUpdate(formData: FormData) {
    try {
      await updateLink(formData);
      setEditingLinkId(null);
      await refreshAfterMutation();
    } catch (err) {
      setError(getThrownMessage(err, "Kunde inte spara länk"));
    }
  }

  async function handleRemove(formData: FormData) {
    try {
      await removeLink(formData);
      if (editingLinkId === formData.get("linkId")) {
        setEditingLinkId(null);
      }
      await refreshAfterMutation();
    } catch (err) {
      setError(getThrownMessage(err, "Kunde inte ta bort länk"));
    }
  }

  return (
    <div className="min-w-0 flex-1 space-y-2">
      {links.length === 0 && !showAddForm ? (
        <p className="text-sm text-muted-foreground">Inga länkar tillagda ännu.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {links.map((link) =>
            editingLinkId === link.id ? (
              <li key={link.id}>
                <form action={handleUpdate} className="space-y-2 rounded border p-2">
                  <input type="hidden" name="groupSlug" value={groupSlug} />
                  <input type="hidden" name="linkId" value={link.id} />
                  <div className="space-y-1">
                    <Label htmlFor={`edit-url-${link.id}`} className="text-xs">
                      Länk
                    </Label>
                    <Input
                      id={`edit-url-${link.id}`}
                      name="url"
                      type="url"
                      defaultValue={link.url}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`edit-label-${link.id}`} className="text-xs">
                      Etikett (valfritt)
                    </Label>
                    <Input
                      id={`edit-label-${link.id}`}
                      name="label"
                      defaultValue={link.label ?? ""}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" size="sm">
                      Spara
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingLinkId(null);
                        setError(null);
                      }}
                    >
                      Avbryt
                    </Button>
                  </div>
                </form>
              </li>
            ) : (
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
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 shrink-0"
                  disabled={editingLinkId !== null}
                  aria-label={`Redigera länk ${labelForLink(link)}`}
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingLinkId(link.id);
                    setError(null);
                  }}
                >
                  <Pencil className="size-3.5" />
                </Button>
                <form action={handleRemove}>
                  <input type="hidden" name="groupSlug" value={groupSlug} />
                  <input type="hidden" name="linkId" value={link.id} />
                  <Button
                    type="submit"
                    variant="ghost"
                    size="sm"
                    className="h-7 shrink-0 px-2"
                    disabled={editingLinkId !== null}
                  >
                    Ta bort
                  </Button>
                </form>
              </li>
            )
          )}
        </ul>
      )}

      {showAddForm ? (
        <form action={handleAdd} className="space-y-2 rounded border p-2">
          <input type="hidden" name="groupSlug" value={groupSlug} />
          <input type="hidden" name="pieceId" value={pieceId} />
          <div className="space-y-1">
            <Label htmlFor={`add-url-${pieceId}`} className="text-xs">
              Länk
            </Label>
            <Input id={`add-url-${pieceId}`} name="url" type="url" required />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`add-label-${pieceId}`} className="text-xs">
              Etikett (valfritt)
            </Label>
            <Input id={`add-label-${pieceId}`} name="label" />
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm">
              Lägg till
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowAddForm(false);
                setError(null);
              }}
            >
              Avbryt
            </Button>
          </div>
        </form>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2"
          disabled={editingLinkId !== null}
          onClick={() => {
            setShowAddForm(true);
            setEditingLinkId(null);
            setError(null);
          }}
        >
          + Lägg till länk
        </Button>
      )}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
