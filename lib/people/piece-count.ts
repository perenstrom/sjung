/** How many Pieces a Person is credited on, as the Upphovspersoner list says it. */
export function formatPieceCount(count: number): string {
  return `${count} ${count === 1 ? "stycke" : "stycken"}`;
}
