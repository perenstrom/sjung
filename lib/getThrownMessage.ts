/**
 * Turn thrown values from server actions into a user-visible string.
 * Prefers non-empty `Error.message`; otherwise returns the Swedish fallback.
 */
export function getThrownMessage(error: unknown, fallbackSv: string): string {
  if (error instanceof Error) {
    const msg = error.message.trim();
    if (msg !== "") {
      return msg;
    }
  }
  return fallbackSv;
}
