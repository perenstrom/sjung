/**
 * The MuseScore converter worker (ADR-0009): the only module that talks to
 * it. It turns a MuseScore score into compressed MusicXML (`.mxl`); its API
 * is in `workers/musescore-converter/README.md`. Integration tests run this
 * client against the fake in `__tests__/support/fake-musescore-converter.ts`.
 */

/** What the worker answers with. */
export const MXL_MIME_TYPE = "application/vnd.recordare.musicxml";

/**
 * The worker converts one score at a time, waits up to 30 s for each and
 * queues four more, so a score may wait about 2.5 minutes for its turn.
 */
const CONVERT_TIMEOUT_MS = 3 * 60 * 1000;
const ERROR_TEXT_LIMIT = 500;

/** The score converted to `.mxl`. Throws if the worker refuses it, fails or can't be reached. */
export async function convertMuseScore(score: Uint8Array): Promise<Uint8Array> {
  const response = await fetch(new URL("/convert", converterUrl()), {
    method: "POST",
    headers: { "content-type": "application/octet-stream" },
    // A copy, typed as backed by a plain ArrayBuffer as `fetch` requires.
    body: new Uint8Array(score),
    signal: AbortSignal.timeout(CONVERT_TIMEOUT_MS),
  });
  if (!response.ok) {
    const detail = (await response.text().catch(() => "")).slice(0, ERROR_TEXT_LIMIT);
    throw new Error(`The MuseScore converter answered ${response.status}: ${detail}`);
  }
  return new Uint8Array(await response.arrayBuffer());
}

function converterUrl(): string {
  const url = process.env.MUSESCORE_CONVERTER_URL?.trim();
  if (!url) {
    throw new Error("Saknar miljövariabel: MUSESCORE_CONVERTER_URL");
  }
  return url;
}
