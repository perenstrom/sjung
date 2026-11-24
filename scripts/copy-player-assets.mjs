// Copies the files the player loads at runtime from node_modules into
// public/vendor, which is not committed. Runs after every npm install, so the
// copies always match the installed packages.
import { copyFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const ASSETS = [
  // SpessaSynth's AudioWorklet processor, loaded by `audioWorklet.addModule` (MIDI_PROCESSOR_PATH).
  ["node_modules/spessasynth_lib/dist/spessasynth_processor.min.js", "public/vendor/spessasynth_processor.min.js"],
];

for (const [from, to] of ASSETS) {
  await mkdir(dirname(join(root, to)), { recursive: true });
  await copyFile(join(root, from), join(root, to));
}
