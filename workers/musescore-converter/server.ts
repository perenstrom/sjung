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
  /** How many conversions may wait behind the running one before the worker answers 503. */
  maxWaiting: number;
};

type Conversion = { ok: true; mxl: Buffer } | { ok: false; status: 422 | 504; message: string };

export function createConverterServer(options: ConverterOptions): Server {
  // One MuseScore at a time keeps memory within the container's limit; the
  // PER-476 spike measured up to about 260 MB for one conversion. Capping the
  // queue bounds the memory held by waiting scores and how long a caller waits.
  const oneAtATime = queue(options.maxWaiting);

  return createServer(async (request, response) => {
    const reply = (status: number, message: string) =>
      response.writeHead(status, { "content-type": "text/plain; charset=utf-8" }).end(message);

    const path = new URL(request.url ?? "/", "http://worker").pathname;
    if (path === "/health" && request.method === "GET") return reply(200, "ok");
    if (path !== "/convert") return reply(404, "Not found.");
    if (request.method !== "POST") return reply(405, "Use POST.");

    try {
      const body = await readBody(request, options.maxBytes);
      if (body.tooLarge) {
        // Stop the upload rather than read the rest of it.
        response.setHeader("connection", "close");
        reply(413, `Scores may be at most ${options.maxBytes} bytes.`);
        return request.destroy();
      }
      const { score } = body;
      if (score.length === 0) return reply(400, "Send the score as the request body.");

      const conversion = await oneAtATime(() => convert(score, options));
      if (conversion === "full") return reply(503, "Too many scores are waiting; try again shortly.");
      if (!conversion.ok) return reply(conversion.status, conversion.message);
      response.writeHead(200, { "content-type": "application/vnd.recordare.musicxml" }).end(conversion.mxl);
    } catch (error) {
      console.error(error);
      reply(500, "The conversion failed unexpectedly.");
    }
  });
}

/**
 * Runs each task only after the ones before it have settled, turning a task
 * away with "full" when `maxWaiting` tasks are already waiting.
 */
function queue(maxWaiting: number) {
  let last: Promise<unknown> = Promise.resolve();
  let pending = 0;
  return async <T>(task: () => Promise<T>): Promise<T | "full"> => {
    if (pending > maxWaiting) return "full";
    pending++;
    const result = last.then(task, task);
    last = result.catch(() => {});
    try {
      return await result;
    } finally {
      pending--;
    }
  };
}

type Body = { tooLarge: false; score: Buffer } | { tooLarge: true };

/** Reads the whole body, stopping as soon as it is known to pass `maxBytes`. */
async function readBody(request: IncomingMessage, maxBytes: number): Promise<Body> {
  if (Number(request.headers["content-length"]) > maxBytes) return { tooLarge: true };
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBytes) return { tooLarge: true };
    chunks.push(chunk);
  }
  return { tooLarge: false, score: Buffer.concat(chunks) };
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

type RunResult = { exitCode: number | null; timedOut: boolean; log: string };

/**
 * Runs a process to the end, keeping what it printed for the error response.
 * Past the time limit it kills the process's whole group, since MuseScore's
 * AppRun starts the real binary as a child of its own.
 */
function run(executable: string, args: string[], timeoutMs: number): Promise<RunResult> {
  return new Promise((done, fail) => {
    const child = spawn(executable, args, { stdio: ["ignore", "pipe", "pipe"], detached: true });
    let log = "";
    let timedOut = false;
    child.stdout.on("data", (chunk) => (log += chunk));
    child.stderr.on("data", (chunk) => (log += chunk));
    const timer = setTimeout(() => {
      timedOut = true;
      try {
        process.kill(-child.pid!, "SIGKILL");
      } catch {
        // The group exited between the timer firing and "close"; nothing to kill.
      }
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
    command: [process.env.MUSESCORE_COMMAND || "/opt/musescore/AppRun"],
    timeoutMs: positiveInteger("CONVERT_TIMEOUT_MS", 30_000),
    maxBytes: positiveInteger("MAX_SCORE_BYTES", 20 * 1024 * 1024),
    maxWaiting: positiveInteger("MAX_WAITING", 4),
  });
  const port = positiveInteger("PORT", 8080);
  server.listen(port, () => console.log(`MuseScore converter listening on port ${port}`));
  // Finishes the running and waiting conversions first; a stop grace period
  // shorter than that cuts them off.
  process.on("SIGTERM", () => server.close(() => process.exit(0)));
}

/** Reads a whole-number setting, refusing to start on a value that isn't one. */
function positiveInteger(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive whole number, not "${raw}".`);
  }
  return value;
}
