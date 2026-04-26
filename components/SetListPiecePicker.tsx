"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PieceOption = {
  id: string;
  name: string;
};

type SetListPiecePickerProps = {
  pieces: PieceOption[];
};

export function SetListPiecePicker({ pieces }: SetListPiecePickerProps) {
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

  useEffect(() => {
    if (filteredPieces.length === 0) {
      return;
    }
    if (!filteredPieces.some((piece) => piece.id === selectedPieceId)) {
      setSelectedPieceId(filteredPieces[0].id);
    }
  }, [filteredPieces, selectedPieceId]);

  return (
    <div className="space-y-1">
      <Label htmlFor="piece-search">Stycke</Label>
      <Input
        id="piece-search"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Sök stycke..."
      />
      <select
        name="pieceId"
        value={filteredPieces.length === 0 ? "" : selectedPieceId}
        onChange={(event) => setSelectedPieceId(event.target.value)}
        required
        className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      >
        {filteredPieces.length === 0 ? (
          <option value="" disabled>
            Inga stycken matchar
          </option>
        ) : (
          filteredPieces.map((piece) => (
            <option key={piece.id} value={piece.id}>
              {piece.name}
            </option>
          ))
        )}
      </select>
      <p className="text-xs text-muted-foreground">Filtrera och valj sedan stycke i listan.</p>
    </div>
  );
}
