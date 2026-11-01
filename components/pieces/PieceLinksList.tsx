"use client";

import { ExternalLink, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { removeLink } from "@/app/actions/pieces";
import { EditPieceLinkPopover } from "@/components/pieces/EditPieceLinkPopover";
import { labelForLink } from "@/components/pieces/linkLabel";
import type { PieceLink } from "@/components/pieces/types";
import { Button } from "@/components/ui/button";
import { getThrownMessage } from "@/lib/getThrownMessage";

export function PieceLinksList({
  groupSlug,
  links,
  pieceName,
  readOnly = false,
  disabled = false,
  editingLinkId,
  onEditingLinkIdChange,
  compact = false,
}: {
  groupSlug: string;
  links: PieceLink[];
  pieceName?: string;
  /** Keep only opening links; hide edit and remove. */
  readOnly?: boolean;
  disabled?: boolean;
  editingLinkId: string | null;
  onEditingLinkIdChange: (linkId: string | null) => void;
  compact?: boolean;
}) {
  const router = useRouter();
  const [removingLinkId, setRemovingLinkId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

  async function handleRemove(linkId: string) {
    setRemovingLinkId(linkId);
    try {
      const formData = new FormData();
      formData.set("groupSlug", groupSlug);
      formData.set("linkId", linkId);
      await removeLink(formData);
      setRemoveError(null);
      router.refresh();
    } catch (err) {
      setRemoveError(getThrownMessage(err, "Kunde inte ta bort länk"));
    } finally {
      setRemovingLinkId(null);
    }
  }

  if (links.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Inga länkar tillagda ännu.</p>
    );
  }

  function editPopoverProps(link: PieceLink) {
    return {
      groupSlug,
      link,
      pieceName,
      open: editingLinkId === link.id,
      disabled: disabled || removingLinkId === link.id,
      onOpenChange: (nextOpen: boolean) => {
        if (nextOpen) {
          onEditingLinkIdChange(link.id);
        } else if (editingLinkId === link.id) {
          onEditingLinkIdChange(null);
        }
      },
    };
  }

  const isRemoveDisabled = (link: PieceLink) =>
    disabled || editingLinkId !== null || removingLinkId === link.id;

  return (
    <div className="space-y-2">
      {compact ? (
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
              {readOnly ? null : (
                <>
                  <EditPieceLinkPopover
                    {...editPopoverProps(link)}
                    triggerClassName="size-7 shrink-0"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7 shrink-0"
                    onClick={() => handleRemove(link.id)}
                    disabled={isRemoveDisabled(link)}
                    aria-label={`Ta bort länk ${labelForLink(link)}`}
                  >
                    <Trash2 className="size-3.5" aria-hidden="true" />
                  </Button>
                </>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <ul className="space-y-2">
          {links.map((link) => {
            const label = labelForLink(link);
            return (
              <li
                key={link.id}
                className="flex flex-col gap-2 rounded border p-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <ExternalLink
                    className="size-4 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                  <div className="min-w-0">
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block truncate text-sm font-medium text-primary underline-offset-4 hover:underline"
                    >
                      {label}
                      <span className="sr-only">, öppnas i ny flik</span>
                    </a>
                    {label !== link.url ? (
                      <p className="truncate text-xs text-muted-foreground">
                        {link.url}
                      </p>
                    ) : null}
                  </div>
                </div>
                {readOnly ? null : (
                  <div className="flex shrink-0 items-center gap-1">
                    <EditPieceLinkPopover {...editPopoverProps(link)} />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove(link.id)}
                      disabled={isRemoveDisabled(link)}
                      aria-label={`Ta bort länk ${label}`}
                    >
                      {removingLinkId === link.id ? "Tar bort..." : "Ta bort"}
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {removeError ? (
        <p className="text-sm text-destructive">{removeError}</p>
      ) : null}
    </div>
  );
}
