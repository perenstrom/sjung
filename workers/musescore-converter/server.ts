import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type Server } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

export type ConverterOptions = {
  /** The MuseScore CLI and any leading arguments, e.g. `["/opt/musescore/AppRun"]`. */
  command: string[];
  timeoutMs: number;
  maxBytes: number;
};

type Conversion = { ok: true; mxl: Buffer } | { ok: false; status: 422 | 504; message: string };

export function createConverterServer(options: ConverterOptions): Server {
  // One MuseScore at a time keeps memory within the container's limit; the
  // PER-476 spike measured up to about 260 MB for one conversion.
  const oneAtATime = queue();

  return createServer(async (request, response) => {
    const reply = (status: number, message: string) =>
      response.writeHead(status, { "content-type": "text/plain; charset=utf-8" }).end(message);

    const path = new URL(request.url ?? "/", "http://worker").pathname;
    if (path === "/health" && request.method === "GET") return reply(200, "ok");
    if (path !== "/convert") return reply(404, "Not found.");
    if (request.method !== "POST") return reply(405, "Use POST.");

    try {
      const score = await readBody(request, options.maxBytes);
      if (score === "too large") return reply(413, `Scores may be at most ${options.maxBytes} bytes.`);
      if (score.length === 0) return reply(400, "Send the score as the request body.");

      const conversion = await oneAtATime(() => convert(score, options));
      if (!conversion.ok) return reply(conversion.status, conversion.message);
      response.writeHead(200, { "content-type": "application/vnd.recordare.musicxml" }).end(conversion.mxl);
    } catch (error) {
      console.error(error);
      reply(500, "The conversion failed unexpectedly.");
    }
  });
}

/** Runs each task only after the ones before it have settled. */
function queue() {
  let last: Promise<unknown> = Promise.resolve();
  return <T>(task: () => Promise<T>): Promise<T> => {
    const result = last.then(task, task);
    last = result.catch(() => {});
    return result;
  };
}

/** Reads the whole body, or reports it too large once it passes `maxBytes`. */
async function readBody(request: IncomingMessage, maxBytes: number): Promise<Buffer | "too large"> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    // Keep reading past the limit, discarding the rest, so the client gets the answer.
    if (size <= maxBytes) chunks.push(chunk);
  }
  return size > maxBytes ? "too large" : Buffer.concat(chunks);
}

async function convert(score: Buffer, options: ConverterOptions): Promise<Conversion> {
  const dir = await mkdtemp(join(tmpdir(), "musescore-"));
  try {
    const input = join(dir, "score.mscz");
    const output = join(dir, "score.mxl");
    await writeFile(input, score);
    const [executable, ...leading] = options.command;
    // Without -f MuseScore refuses some real files as corrupted.
    const { exitCode, timedOut, log } = await run(
      executable,
      [...leading, "-f", "-o", output, input],
      options.timeoutMs,
    );
    if (timedOut) {
      return { ok: false, status: 504, message: `MuseScore took longer than ${options.timeoutMs} ms.\n${log}` };
    }
    if (exitCode !== 0) return { ok: false, status: 422, message: `MuseScore exited with ${exitCode}.\n${log}` };
    try {
      return { ok: true, mxl: await readFile(output) };
    } catch {
      return { ok: false, status: 422, message: `MuseScore wrote no MusicXML.\n${log}` };
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

type Run = { exitCode: number | null; timedOut: boolean; log: string };

/**
 * Runs a process to the end, keeping what it printed for the error response.
 * Past the time limit it kills the process's whole group, since MuseScore's
 * AppRun starts the real binary as a child of its own.
 */
function run(executable: string, args: string[], timeoutMs: number): Promise<Run> {
  return new Promise((done, fail) => {
    const child = spawn(executable, args, { stdio: ["ignore", "pipe", "pipe"], detached: true });
    let log = "";
    let timedOut = false;
    child.stdout.on("data", (chunk) => (log += chunk));
    child.stderr.on("data", (chunk) => (log += chunk));
    const timer = setTimeout(() => {
      timedOut = true;
      process.kill(-child.pid!, "SIGKILL");
    }, timeoutMs);
    child.on("error", (error) => {
      clearTimeout(timer);
      fail(error);
    });
    child.on("close", (exitCode) => {
      clearTimeout(timer);
      done({ exitCode, timedOut, log });
    });
  });
}

// Started directly (`node server.ts` in the container) rather than imported by a test.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const server = createConverterServer({
    command: [process.env.MUSESCORE_COMMAND ?? "/opt/musescore/AppRun"],
    timeoutMs: Number(process.env.CONVERT_TIMEOUT_MS ?? 30_000),
    maxBytes: Number(process.env.MAX_SCORE_BYTES ?? 20 * 1024 * 1024),
  });
  const port = Number(process.env.PORT ?? 8080);
  server.listen(port, () => console.log(`MuseScore converter listening on port ${port}`));
  process.on("SIGTERM", () => server.close(() => process.exit(0)));
}
