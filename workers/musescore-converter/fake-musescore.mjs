// Stands in for the MuseScore CLI in server.test.ts. Called the way the worker
// calls MuseScore (`-f -o <out> <in>`), it acts on the score's text:
// "corrupt" fails like MuseScore does on a file it can't read, "hang" never
// finishes, "slow" takes a moment, and anything else is "converted" by writing
// "MXL:" + the score. It fails if another fake is running at the same time.
import { linkSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

const [, , force, outFlag, outPath, inPath] = process.argv;
if (force !== "-f" || outFlag !== "-o") {
  console.error(`unexpected arguments: ${process.argv.slice(2).join(" ")}`);
  process.exit(2);
}

// The lock holds its owner's pid, so a lock left by a fake the worker killed
// (which can't clean up after SIGKILL) doesn't count.
const lock = join(tmpdir(), "fake-musescore.lock");
if (!takeLock() && !(ownerIsGone() && (rmSync(lock, { force: true }), takeLock()))) {
  console.error("another MuseScore is already running");
  process.exit(3);
}
process.on("exit", () => rmSync(lock, { force: true }));

// Linking a finished file into place is atomic, so no fake sees a lock
// without its pid in it.
function takeLock() {
  const mine = `${lock}.${process.pid}`;
  writeFileSync(mine, String(process.pid));
  try {
    linkSync(mine, lock);
    return true;
  } catch {
    return false;
  } finally {
    rmSync(mine);
  }
}

function ownerIsGone() {
  const pid = Number(readFileSync(lock, "utf8"));
  try {
    process.kill(pid, 0);
    return !(pid > 0);
  } catch {
    return true;
  }
}

const score = readFileSync(inPath, "utf8");
if (score.includes("corrupt")) {
  console.error("Error: file is corrupted");
  process.exit(1);
} else if (score.includes("hang")) {
  setInterval(() => {}, 1000);
} else {
  if (score.includes("slow")) await sleep(300);
  writeFileSync(outPath, `MXL:${score}`);
}
