import {
  createColumnHelper,
  createTable,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
} from "@tanstack/react-table";
import { describe, expect, it } from "vitest";

import { caseInsensitiveSortingFns } from "./sorting";

type Row = { name: string };

const columnHelper = createColumnHelper<Row>();
const columns = [
  columnHelper.accessor("name", {
    header: "Namn",
    enableSorting: true,
    sortingFn: "caseInsensitive",
  }),
];

function sortedNames(data: Row[], sorting: SortingState): string[] {
  const table = createTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: () => {},
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    sortingFns: caseInsensitiveSortingFns,
  });
  return table.getRowModel().rows.map((row) => row.original.name);
}

describe("DataTable sorting (TanStack row model)", () => {
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
