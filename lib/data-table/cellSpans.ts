export type SpannedCell<TCell> = {
  cell: TCell;
  colSpan: number;
};

/**
 * Lays out one row's cells when some of them span several columns: a cell with
 * span n covers itself and the n - 1 cells after it, which are dropped. Spans
 * are clamped to at least 1 and to the cells left in the row.
 */
export function spanCells<TCell>(
  cells: TCell[],
  getColSpan: (cell: TCell) => number
): SpannedCell<TCell>[] {
  const spanned: SpannedCell<TCell>[] = [];
  let index = 0;
  while (index < cells.length) {
    const cell = cells[index];
    const colSpan = Math.min(Math.max(getColSpan(cell), 1), cells.length - index);
    spanned.push({ cell, colSpan });
    index += colSpan;
  }
  return spanned;
}
