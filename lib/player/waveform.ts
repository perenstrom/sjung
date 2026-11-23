/**
 * The waveform strip on desktop: `bars` heights from 0 to 1, each the loudest
 * sample of any channel in its stretch of the file, scaled so the loudest bar
 * is 1. Fewer bars than asked for when the file has fewer samples.
 */
export function peaksOf(channels: readonly Float32Array[], bars: number): number[] {
  const length = Math.min(...channels.map((channel) => channel.length));
  const count = Math.min(bars, length);
  const peaks = Array.from({ length: count }, (_, bar) => {
    const from = Math.floor((bar * length) / count);
    const to = Math.floor(((bar + 1) * length) / count);
    let peak = 0;
    for (const channel of channels) {
      for (let sample = from; sample < to; sample++) peak = Math.max(peak, Math.abs(channel[sample]));
    }
    return peak;
  });
  const loudest = Math.max(0, ...peaks);
  return loudest === 0 ? peaks : peaks.map((peak) => peak / loudest);
}

/**
 * Fetches and decodes an audio file to draw its waveform. Only for the
 * picture: the audio engine itself plays the plain `<audio>` element and
 * never decodes. Rejects when the file can't be fetched (the storage bucket
 * must allow a cross-origin GET) or decoded; the strip then stays flat.
 */
export async function loadWaveform(src: string, bars: number, signal: AbortSignal): Promise<number[]> {
  // Not from the cache: the `<audio>` element's own request is cached without
  // the CORS headers this cross-origin read needs, and would be refused.
  const response = await fetch(src, { signal, cache: "no-store" });
  if (!response.ok) throw new Error(`Waveform fetch failed: ${response.status}`);
  const encoded = await response.arrayBuffer();
  // An offline context decodes without asking to play anything.
  const audio = await new OfflineAudioContext(1, 1, 44_100).decodeAudioData(encoded);
  const channels = Array.from({ length: audio.numberOfChannels }, (_, index) => audio.getChannelData(index));
  return peaksOf(channels, bars);
}
