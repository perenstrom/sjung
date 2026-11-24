import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";

// Stand-in for the MuseScore converter worker (ADR-0009) at its HTTP
// boundary, started for every integration test by ./setup.ts. The app's own
// client (`@/lib/musescore-converter`) runs for real against it, through
// `MUSESCORE_CONVERTER_URL`. It answers like the worker: `POST /convert` with
// a score's bytes gives `.mxl` bytes, which here are the score's bytes after
// `CONVERTED_PREFIX`, so a test can tell which score a copy came from.

export const CONVERTED_PREFIX = "mxl:";

let server: Server | null = null;
let url = "";
let scores: Uint8Array[] = [];
let failingStatus: number | null = null;
let held: { promise: Promise<void>; release: () => void } | null = null;
let arrived: (() => void)[] = [];

export async function startFakeMuseScoreConverter() {
  server = createServer(async (request, response) => {
    const chunks: Buffer[] = [];
    for await (const chunk of request) {
      chunks.push(chunk as Buffer);
    }
    const score = Buffer.concat(chunks);
    if (request.method !== "POST" || request.url !== "/convert") {
      response.writeHead(404).end();
      return;
    }

    scores.push(new Uint8Array(score));
    for (const notify of arrived.splice(0)) notify();
    await held?.promise;

    if (failingStatus !== null) {
      response.writeHead(failingStatus, { "content-type": "text/plain" }).end("MuseScore kunde inte läsa filen");
      return;
    }
    response
      .writeHead(200, { "content-type": "application/vnd.recordare.musicxml" })
      .end(Buffer.concat([Buffer.from(CONVERTED_PREFIX), score]));
  });
  await new Promise<void>((resolve) => server!.listen(0, "127.0.0.1", resolve));
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  process.env.MUSESCORE_CONVERTER_URL = url;
}

export async function stopFakeMuseScoreConverter() {
  held?.release();
  await new Promise<void>((resolve) => (server ? server.close(() => resolve()) : resolve()));
  server = null;
}

/** The scores sent to the converter so far, oldest first. */
export function convertedScores(): Uint8Array[] {
  return [...scores];
}

/** Makes every later conversion answer with this error status, as the worker does when MuseScore fails. */
export function failConversionsWith(status: number) {
  failingStatus = status;
}

/** Points the app at an address where nothing answers. */
export function makeConverterUnreachable() {
  process.env.MUSESCORE_CONVERTER_URL = "http://127.0.0.1:1";
}

/**
 * Holds every later conversion until the returned function is called, so a
 * test can change a File while its conversion is under way.
 */
export function holdConversions(): () => void {
  let release = () => {};
  const promise = new Promise<void>((resolve) => (release = resolve));
  held = { promise, release };
  return release;
}

/** Resolves once the converter has received a score. */
export function conversionArrived(): Promise<void> {
  return new Promise((resolve) => arrived.push(resolve));
}

export function resetFakeMuseScoreConverter() {
  held?.release();
  held = null;
  scores = [];
  failingStatus = null;
  arrived = [];
  process.env.MUSESCORE_CONVERTER_URL = url;
}
