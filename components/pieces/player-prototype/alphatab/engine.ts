"use client";

// PROTOTYPE (PER-464, PER-463): alphaTab loaded straight from /public as a native ES
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
