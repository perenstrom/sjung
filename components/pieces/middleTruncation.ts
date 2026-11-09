// How many characters at the end of a name never shrink, so a file's
// extension and the part that tells similar names apart stay visible.
const END_LENGTH = 10;

/**
 * Splits `text` for CSS middle truncation: the start truncates with an
 * ellipsis and the end stays whole. A name no longer than the end is kept
 * whole in the start, so it still truncates at its end if it must.
 */
export function splitForMiddleTruncation(text: string): {
  start: string;
  end: string;
} {
  // Code points, so a split never lands inside a surrogate pair.
  const characters = Array.from(text);
  if (characters.length <= END_LENGTH) {
    return { start: text, end: "" };
  }

  return {
    start: characters.slice(0, -END_LENGTH).join(""),
    end: characters.slice(-END_LENGTH).join(""),
  };
}
