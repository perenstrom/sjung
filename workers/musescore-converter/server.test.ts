import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createConverterServer, type ConverterOptions } from "./server";

const fakeMuseScore = [process.execPath, resolve(__dirname, "fake-musescore.mjs")];

let server: Server | undefined;

afterEach(async () => {
  await new Promise((done) => server?.close(done) ?? done(undefined));
  server = undefined;
});

async function startWorker(options: Partial<ConverterOptions> = {}): Promise<string> {
  server = createConverterServer({
    command: fakeMuseScore,
    timeoutMs: 5000,
    maxBytes: 1024,
    maxWaiting: 4,
    ...options,
  });
  await new Promise<void>((listening) => server!.listen(0, "127.0.0.1", listening));
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

function convert(url: string, score: string) {
  return fetch(`${url}/convert`, { method: "POST", body: score });
}

describe("MuseScore converter worker", () => {
  it("returns the MusicXML MuseScore writes for a score", async () => {
    const url = await startWorker();

    const response = await convert(url, "Locus iste");

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/vnd.recordare.musicxml");
    expect(await response.text()).toBe("MXL:Locus iste");
  });

  it("answers 422 with MuseScore's error when it can't convert the score", async () => {
    const url = await startWorker();

    const response = await convert(url, "corrupt score");

    expect(response.status).toBe(422);
    expect(await response.text()).toContain("Error: file is corrupted");
  });

  it("answers 504 and stops MuseScore when a conversion runs past the time limit", async () => {
    const url = await startWorker({ timeoutMs: 200 });

    const timedOut = await convert(url, "hang");
    const next = await convert(url, "Abendlied");

    expect(timedOut.status).toBe(504);
    expect(next.status).toBe(200);
  });

  it("converts one score at a time", async () => {
    const url = await startWorker();

    const responses = await Promise.all([convert(url, "slow one"), convert(url, "slow two")]);

    expect(responses.map((response) => response.status)).toEqual([200, 200]);
  });

  it("answers 503 when too many scores are already waiting", async () => {
    const url = await startWorker({ maxWaiting: 1 });

    const responses = await Promise.all(["slow one", "slow two", "slow three"].map((score) => convert(url, score)));

    expect(responses.map((response) => response.status).sort()).toEqual([200, 200, 503]);
  });

  it.each([
    { case: "an empty body", score: "", status: 400 },
    { case: "a score over the size limit", score: "x".repeat(1025), status: 413 },
  ])("answers $status to $case without running MuseScore", async ({ score, status }) => {
    const url = await startWorker({ command: ["/nonexistent/musescore"] });

    const response = await convert(url, score);

    expect(response.status).toBe(status);
  });

  it("answers health checks and nothing else", async () => {
    const url = await startWorker();

    const health = await fetch(`${url}/health`);
    const getConvert = await fetch(`${url}/convert`);
    const elsewhere = await fetch(`${url}/files`, { method: "POST", body: "Locus iste" });

    expect([health.status, await health.text()]).toEqual([200, "ok"]);
    expect(getConvert.status).toBe(405);
    expect(elsewhere.status).toBe(404);
  });
});
