/**
 * The id a link carries in a search param, such as the Set list piece a Piece
 * link carries in `setlistpiece`; `undefined` when it is missing, empty or repeated.
 */
export function searchParamId(param: string | string[] | undefined): string | undefined {
  return typeof param === "string" && param !== "" ? param : undefined;
}
