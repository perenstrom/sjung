/** Fetches `url` whole, or rejects if it can't, or once `signal` aborts. */
export async function fetchBuffer(url: string, signal: AbortSignal): Promise<ArrayBuffer> {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Could not fetch ${new URL(url).pathname}: ${response.status}`);
  return response.arrayBuffer();
}

/**
 * Web Audio is muted by an iPhone's silent switch unless the page says it
 * plays media, as an `<audio>` element does by itself (Safari 17+).
 */
export function playThroughSilentSwitch() {
  const { audioSession } = navigator as Navigator & { audioSession?: { type: string } };
  if (audioSession) audioSession.type = "playback";
}
