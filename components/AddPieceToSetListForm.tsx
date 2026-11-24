"use client";

import { Check } from "lucide-react";
import { useActionState, useMemo, useState } from "react";
import { addPieceToSetList } from "@/app/actions/setlists";
import { PieceAliasesLine } from "@/components/pieces/PieceAliasesLine";
import { SearchCombobox, useCloseSearchCombobox } from "@/components/SearchCombobox";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import { getThrownMessage } from "@/lib/getThrownMessage";
import { searchPieces } from "@/lib/pieces/search";
import type { SetListPieceOption } from "@/lib/setlists/types";
import { cn } from "@/lib/utils";

type AddPieceToSetListFormProps = {
  groupSlug: string;
  setListId: string;
  // No credits, so the search doesn't look at credited People.
  pieces: SetListPieceOption[];
};

/**
 * Pick a Piece and add it to the end of a Set list. The picker finds a Piece
 * by its name or an Alias, like Alla noter but not by credited People, and a
 * result found only by its Aliases shows the matching ones under its name.
 * After a successful add the pick starts over, ready for the next Piece; after
 * a failed add it is kept so the user can retry.
 */
export function AddPieceToSetListForm({ groupSlug, setListId, pieces }: AddPieceToSetListFormProps) {
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null);
  const selectedPiece = pieces.find((piece) => piece.id === selectedPieceId);

  const [error, formAction, isPending] = useActionState(async (_previousError: string | null, formData: FormData) => {
    try {
      await addPieceToSetList(formData);
    } catch (err) {
      return getThrownMessage(err, "Kunde inte lägga till stycke");
    }
    setSelectedPieceId(null);
    return null;
  }, null);

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="groupSlug" value={groupSlug} />
      <input type="hidden" name="setListId" value={setListId} />
      <input type="hidden" name="pieceId" value={selectedPiece?.id ?? ""} />
      <div className="flex flex-wrap gap-3 sm:items-end">
        <div className="flex w-full flex-wrap gap-2 sm:w-80">
          <Label className="w-full">Stycke</Label>
          <SearchCombobox
            aria-label="Stycke"
            className="w-full"
            selectedLabel={selectedPiece?.name}
            placeholder="Välj stycke…"
          >
            <PieceSearch pieces={pieces} selectedPieceId={selectedPiece?.id} onPick={setSelectedPieceId} />
          </SearchCombobox>
        </div>
        <Button type="submit" disabled={!selectedPiece || isPending}>
          Lägg till
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </form>
  );
}

/** Mounts when the picker opens, so the typed text starts empty each time. */
function PieceSearch({
  pieces,
  selectedPieceId,
  onPick,
}: {
  pieces: SetListPieceOption[];
  selectedPieceId: string | undefined;
  onPick: (pieceId: string) => void;
}) {
  const close = useCloseSearchCombobox();
  const [query, setQuery] = useState("");
  const results = useMemo(() => searchPieces(pieces, query), [pieces, query]);

  return (
    <Command shouldFilter={false}>
      <CommandInput placeholder="Sök stycke…" autoFocus value={query} onValueChange={setQuery} />
      <CommandList>
        <CommandEmpty>Inga stycken matchar</CommandEmpty>
        {results.map(({ piece, matchingAliases }) => {
          const checked = piece.id === selectedPieceId;
          return (
            <CommandItem
              key={piece.id}
              value={piece.id}
              onSelect={() => {
                onPick(piece.id);
                close();
              }}
            >
              <Check className={cn("size-4", !checked && "invisible")} aria-hidden="true" />
              <span className="flex flex-1 flex-col">
                <span>
                  {piece.name}
                  {checked ? <span className="sr-only">, vald</span> : null}
                </span>
                <PieceAliasesLine aliases={matchingAliases} className="text-xs" />
              </span>
            </CommandItem>
          );
        })}
      </CommandList>
    </Command>
  );
}
