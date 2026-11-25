/** A number of Pieces as the UI says it: "1 stycke", "12 stycken". */
export function formatPieceCount(count: number): string {
  return `${count} ${count === 1 ? "stycke" : "stycken"}`;
}
