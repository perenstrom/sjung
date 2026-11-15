"use client";

import { SearchIcon, XIcon } from "lucide-react";
import { useRef, useState } from "react";

import { PiecesTable } from "@/components/pieces/PiecesTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PieceWithRelations } from "@/lib/pieces/types";
import type { Person } from "@/types/piece-credit-dialog";

const SEARCH_LABEL = "Sök stycke eller upphovsperson";

/**
 * Alla noter: a search box above the pieces table that narrows the list, in
 * the browser, to the pieces whose name or credited Person matches. The text
 * isn't kept anywhere, so the box starts empty on every visit.
 */
export function SearchablePiecesTable(props: {
  pieces: PieceWithRelations[];
  people: Person[];
  groupSlug: string;
}) {
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-4">
      <div className="relative md:max-w-sm">
        <SearchIcon
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
          aria-hidden="true"
        />
        <Input
          ref={inputRef}
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label={SEARCH_LABEL}
          placeholder={SEARCH_LABEL}
          // Our own clear button replaces the browser's, so there is one on every browser.
          className="pr-10 pl-9 [&::-webkit-search-cancel-button]:appearance-none"
        />
        {search ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute top-1/2 right-0 -translate-y-1/2"
            aria-label="Rensa sökning"
            onClick={() => {
              setSearch("");
              inputRef.current?.focus();
            }}
          >
            <XIcon aria-hidden="true" />
          </Button>
        ) : null}
      </div>
      <PiecesTable {...props} search={search} />
    </div>
  );
}
