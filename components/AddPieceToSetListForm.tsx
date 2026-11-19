"use client";

import { useActionState, useMemo, useState } from "react";
import { addPieceToSetList } from "@/app/actions/setlists";
import { PieceAliasesLine } from "@/components/pieces/PieceAliasesLine";
import { getThrownMessage } from "@/lib/getThrownMessage";
import { searchPieces } from "@/lib/pieces/search";
import type { SetListPieceOption } from "@/lib/setlists/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type AddPieceToSetListFormProps = {
  groupSlug: string;
  setListId: string;
  // No credits, so the search doesn't look at credited People.
  pieces: SetListPieceOption[];
};

/**
 * Search for a Piece and add it to the end of a Set list. The search finds a
 * Piece by its name or an Alias, like Alla noter but not by credited People,
 * and an option found only by its Aliases shows the matching ones under its
 * name. After a successful add the search and selection start over, ready for
 * the next Piece; after a failed add they are kept so the user can retry.
 */
export function AddPieceToSetListForm({
  groupSlug,
  setListId,
  pieces,
}: AddPieceToSetListFormProps) {
  const [query, setQuery] = useState("");
  const [selectedPieceId, setSelectedPieceId] = useState<string>(pieces[0]?.id ?? "");

  const [error, formAction, isPending] = useActionState(
    async (_previousError: string | null, formData: FormData) => {
      try {
        await addPieceToSetList(formData);
      } catch (err) {
        return getThrownMessage(err, "Kunde inte lägga till stycke");
      }
      setQuery("");
      setSelectedPieceId(pieces[0]?.id ?? "");
      return null;
    },
    null
  );

  const searchResults = useMemo(() => searchPieces(pieces, query), [pieces, query]);
  const filteredPieces = useMemo(() => searchResults.map(({ piece }) => piece), [searchResults]);

  const resolvedPieceId = useMemo(() => {
    if (filteredPieces.length === 0) {
      return "";
    }
    const stillValid = filteredPieces.some(
      (piece) => piece.id === selectedPieceId
    );
    return stillValid ? selectedPieceId : filteredPieces[0].id;
  }, [filteredPieces, selectedPieceId]);

  const noFilteredMatches = filteredPieces.length === 0;
  const selectValue =
    noFilteredMatches || !resolvedPieceId ? undefined : resolvedPieceId;

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="groupSlug" value={groupSlug} />
      <input type="hidden" name="setListId" value={setListId} />
      <input type="hidden" name="pieceId" value={resolvedPieceId} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="space-y-1 sm:w-80">
          <Label htmlFor="piece-search">Stycke</Label>
          <Input
            id="piece-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Sök stycke..."
          />
          <Select
            disabled={noFilteredMatches}
            value={selectValue}
            onValueChange={setSelectedPieceId}
          >
            <SelectTrigger
              className="w-full min-w-0"
              aria-describedby="add-piece-hint"
            >
              <SelectValue placeholder="Inga stycken matchar" />
            </SelectTrigger>
            <SelectContent>
              {searchResults.map(({ piece, matchingAliases }) => (
                <SelectItem key={piece.id} value={piece.id}>
                  <span className="flex flex-col items-start">
                    {piece.name}
                    {/* Explains the match in the list, not in the chosen value. */}
                    <PieceAliasesLine
                      aliases={matchingAliases}
                      className="text-xs in-data-[slot=select-value]:hidden"
                    />
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p
            id="add-piece-hint"
            className="text-xs text-muted-foreground"
          >
            Filtrera och välj sedan stycke i listan.
          </p>
        </div>
        <Button type="submit" disabled={pieces.length === 0 || isPending}>
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
