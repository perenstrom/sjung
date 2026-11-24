// Copies the files the player loads at runtime from node_modules into
// public/vendor, which is not committed. Runs after every npm install, so the
// copies always match the installed packages.
import { copyFile, cp, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ALPHATAB = "node_modules/@coderline/alphatab/dist";

const FILES = [
  // SpessaSynth's AudioWorklet processor, loaded by `audioWorklet.addModule` (MIDI_PROCESSOR_PATH).
  ["node_modules/spessasynth_lib/dist/spessasynth_processor.min.js", "public/vendor/spessasynth_processor.min.js"],
  // alphaTab, loaded as a native ES module (ALPHATAB_MODULE), and the worker and worklet it finds next to itself.
  ...["alphaTab.min.mjs", "alphaTab.core.min.mjs", "alphaTab.worker.min.mjs", "alphaTab.worklet.min.mjs"].map(
    (name) => [`${ALPHATAB}/${name}`, `public/vendor/alphatab/${name}`],
  ),
];

for (const [from, to] of FILES) {
  await mkdir(dirname(join(root, to)), { recursive: true });
  await copyFile(join(root, from), join(root, to));
}
// alphaTab's music font, Bravura, with its licence.
await cp(join(root, ALPHATAB, "font"), join(root, "public/vendor/alphatab/font"), { recursive: true });
