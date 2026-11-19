"use client";

import { useMemo, useState } from "react";
import { addPieceToSetList } from "@/app/actions/setlists";
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

type PieceOption = {
  id: string;
  name: string;
};

type AddPieceToSetListFormProps = {
  groupSlug: string;
  setListId: string;
  pieces: PieceOption[];
};

/** Search for a Piece and add it to the end of a Set list. */
export function AddPieceToSetListForm({
  groupSlug,
  setListId,
  pieces,
}: AddPieceToSetListFormProps) {
  const [query, setQuery] = useState("");
  const [selectedPieceId, setSelectedPieceId] = useState<string>(pieces[0]?.id ?? "");

  const filteredPieces = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("sv-SE");
    if (!normalized) {
      return pieces;
    }

    return pieces.filter((piece) =>
      piece.name.toLocaleLowerCase("sv-SE").includes(normalized)
    );
  }, [pieces, query]);

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
    <form action={addPieceToSetList} className="space-y-2">
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
              {filteredPieces.map((piece) => (
                <SelectItem key={piece.id} value={piece.id}>
                  {piece.name}
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
        <Button type="submit" disabled={pieces.length === 0}>
          Lägg till
        </Button>
      </div>
    </form>
  );
}
