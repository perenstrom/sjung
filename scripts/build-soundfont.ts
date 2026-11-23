import "dotenv/config";
import { spawn } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { BasicSoundBank, SoundBankLoader } from "spessasynth_core";

import { formatFileSize } from "../lib/formatFileSize";
import { putObject } from "../lib/object-storage";
import { PLAYER_SOUNDFONT_KEY, trimToPlayerPresets } from "../lib/player/soundfont";

// Builds the player's soundfont (ADR-0010): GeneralUser GS trimmed to piano,
// choir aahs and voice oohs, with its samples compressed to Ogg Vorbis (SF3).
// Download GeneralUser-GS.sf2 from https://www.schristiancollins.com first.
// Needs ffmpeg with libvorbis on the PATH. With --upload, the result is also
// stored at PLAYER_SOUNDFONT_KEY in the R2 bucket named in .env.

const VORBIS_QUALITY = "5";

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { upload: { type: "boolean", default: false } },
  });
  const [input, output] = positionals;
  if (!input || !output) {
    console.error("Usage: tsx scripts/build-soundfont.ts <GeneralUser-GS.sf2> <output.sf3> [--upload]");
    process.exit(1);
  }

  const source = await readFile(input);
  const bank = SoundBankLoader.fromArrayBuffer(toArrayBuffer(source));
  trimToPlayerPresets(bank);

  await BasicSoundBank.ready;
  await bank.setSampleFormat({
    format: "compressed",
    compressionFunction: encodeVorbis,
    rejectOnFailure: true,
  });
  const sf3 = new Uint8Array(bank.writeSF2({ software: "Sjung build-soundfont" }));
  await writeFile(output, sf3);

  console.log(`Source:  ${formatFileSize(source.byteLength)} (${input})`);
  console.log(`SF3:     ${formatFileSize(sf3.byteLength)} (${sf3.byteLength} bytes, ${output})`);
  console.log(`Presets: ${bank.presets.map((preset) => `${preset.program} ${preset.name}`).join(", ")}`);
  console.log(`Samples: ${bank.samples.length}`);

  if (values.upload) {
    await putObject(PLAYER_SOUNDFONT_KEY, sf3, { contentType: "audio/x-sf3" });
    console.log(`Stored:  ${PLAYER_SOUNDFONT_KEY} in bucket ${process.env.R2_BUCKET}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

/** One mono sample to an Ogg Vorbis stream, through ffmpeg's libvorbis. */
function encodeVorbis(audioData: Float32Array, sampleRate: number): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn(
      "ffmpeg",
      [
        "-hide_banner",
        "-loglevel",
        "error",
        "-f",
        "f32le",
        "-ar",
        String(sampleRate),
        "-ac",
        "1",
        "-i",
        "pipe:0",
        "-c:a",
        "libvorbis",
        "-q:a",
        VORBIS_QUALITY,
        "-f",
        "ogg",
        "pipe:1",
      ],
      { stdio: ["pipe", "pipe", "inherit"] }
    );
    const chunks: Buffer[] = [];
    ffmpeg.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));
    ffmpeg.on("error", reject);
    ffmpeg.on("close", (code) => {
      if (code === 0) {
        resolve(new Uint8Array(Buffer.concat(chunks)));
      } else {
        reject(new Error(`ffmpeg exited with ${code}`));
      }
    });
    ffmpeg.stdin.end(Buffer.from(audioData.buffer, audioData.byteOffset, audioData.byteLength));
  });
}

function toArrayBuffer(buffer: Buffer): ArrayBuffer {
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
}
