import { createElement } from "react";
import type { SortingState } from "@tanstack/react-table";
import { describe, expect, it } from "vitest";

import { type ColumnDef, DataTable } from "@/components/data-table";
import { renderMarkup } from "@/lib/testing/markup";

type Row = { name: string };

const columns: ColumnDef<Row>[] = [
  { accessorKey: "name", header: "Namn", sortFn: "caseInsensitive" },
];

function sortedNames(data: Row[], sorting: SortingState): string[] {
  const html = renderMarkup(createElement(DataTable<Row>, { columns, data, initialSorting: sorting }));
  return [...html.matchAll(/<td[^>]*>([^<]*)<\/td>/g)].map((match) => match[1]);
}

describe("DataTable sorting", () => {
  const data: Row[] = [
    { name: "Charlie" },
    { name: "Alice" },
    { name: "Bob" },
  ];

  it("sorts ascending by column id", () => {
    expect(sortedNames(data, [{ id: "name", desc: false }])).toEqual([
      "Alice",
      "Bob",
      "Charlie",
    ]);
  });

  it("sorts descending by column id", () => {
    expect(sortedNames(data, [{ id: "name", desc: true }])).toEqual([
      "Charlie",
      "Bob",
      "Alice",
    ]);
  });

  it("keeps source order when sorting state is empty", () => {
    expect(sortedNames(data, [])).toEqual(["Charlie", "Alice", "Bob"]);
  });

  it("sorts case insensitively", () => {
    const mixedCase: Row[] = [
      { name: "bravo" },
      { name: "Alpha" },
      { name: "charlie" },
    ];
    expect(sortedNames(mixedCase, [{ id: "name", desc: false }])).toEqual([
      "Alpha",
      "bravo",
      "charlie",
    ]);
  });
});
