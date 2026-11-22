"use client";

// PROTOTYPE (PER-464): alphaTab loaded straight from /public as a native ES
// module, so the bundler never touches it. alphaTab then finds its worker,
// worklet, font and soundfont next to itself. Throwaway.

import type * as AlphaTabModule from "@coderline/alphatab";

export type AlphaTab = typeof AlphaTabModule;
export type Api = AlphaTabModule.AlphaTabApi;
export type Score = AlphaTabModule.model.Score;
export type Track = AlphaTabModule.model.Track;
export type Beat = AlphaTabModule.model.Beat;
export type Settings = AlphaTabModule.Settings;

export const ASSETS = "/prototype-player/alphatab";

let loading: Promise<AlphaTab> | null = null;

export function loadAlphaTab(): Promise<AlphaTab> {
  // `new Function` keeps Turbopack from rewriting the import.
  const nativeImport = new Function("url", "return import(url)") as (url: string) => Promise<AlphaTab>;
  loading ??= nativeImport(`${ASSETS}/alphaTab.min.mjs`);
  return loading;
}

// ---------------------------------------------------------------- output tap
// Puts an AnalyserNode in front of the speakers so the prototype can show what
// is actually sounding (level and pitch) after mute, solo and volume.

export const outputTap: { analyser: AnalyserNode | null } = { analyser: null };

export function installOutputTap() {
  const w = window as unknown as { __alphaTabTap?: boolean };
  if (w.__alphaTabTap) return;
  w.__alphaTabTap = true;
  const connect = AudioNode.prototype.connect as (this: AudioNode, ...args: unknown[]) => unknown;
  AudioNode.prototype.connect = function (this: AudioNode, ...args: unknown[]) {
    const [dest, ...rest] = args;
    if (dest instanceof AudioDestinationNode && this !== outputTap.analyser) {
      if (!outputTap.analyser || outputTap.analyser.context !== this.context) {
        outputTap.analyser = this.context.createAnalyser();
        outputTap.analyser.fftSize = 4096;
        connect.call(outputTap.analyser, dest);
      }
      connect.call(this, outputTap.analyser, ...rest);
      return dest;
    }
    return connect.call(this, ...args);
  } as typeof AudioNode.prototype.connect;
}

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

/** RMS in dBFS and the strongest pitch (autocorrelation), or null when silent. */
export function readOutput(): { db: number; pitch: string | null } | null {
  const a = outputTap.analyser;
  if (!a) return null;
  const buf = new Float32Array(a.fftSize);
  a.getFloatTimeDomainData(buf);
  let sum = 0;
  for (const x of buf) sum += x * x;
  const rms = Math.sqrt(sum / buf.length);
  const db = rms > 0 ? 20 * Math.log10(rms) : -Infinity;
  if (db < -60) return { db, pitch: null };
  const rate = a.context.sampleRate;
  let best = 0;
  let bestLag = 0;
  for (let lag = Math.floor(rate / 1000); lag < Math.floor(rate / 60); lag++) {
    let c = 0;
    for (let i = 0; i + lag < buf.length; i++) c += buf[i] * buf[i + lag];
    if (c > best) {
      best = c;
      bestLag = lag;
    }
  }
  if (!bestLag) return { db, pitch: null };
  const midi = Math.round(69 + 12 * Math.log2(rate / bestLag / 440));
  return { db, pitch: `${NOTE_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}` };
}
