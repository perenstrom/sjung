/** A quarter note in alphaTab's MIDI ticks. */
export const TICKS_PER_QUARTER = 960;

/**
 * The parts of alphaTab's `MasterBarTickLookup` the bars are read from: one
 * bar of the score each time it is played, in playing order, with the tempo
 * changes inside it. Ticks count from the start of playback.
 */
export type BarTickLookup = {
  masterBar: { index: number };
  start: number;
  end: number;
  tempoChanges: readonly { tick: number; tempo: number }[];
};

/**
 * One bar as it is played: the bar `number` the score shows (a bar in a
 * repeat is played, and listed, more than once), and when it starts and ends,
 * in ticks and in seconds at the score's own tempo.
 */
export type NotationBar = { number: number; startTick: number; endTick: number; start: number; end: number };

/**
 * The bars of a score in playing order, timed from alphaTab's tick lookup
 * with `initialTempo` (quarter notes a minute) until the score changes it.
 */
export function notationBarsOf(lookups: readonly BarTickLookup[], initialTempo: number): NotationBar[] {
  let tempo = initialTempo;
  let seconds = 0;
  return lookups.map(({ masterBar, start, end, tempoChanges }) => {
    const barStart = seconds;
    let tick = start;
    for (const change of [...tempoChanges].sort((a, b) => a.tick - b.tick)) {
      seconds += ticksToSeconds(Math.max(0, change.tick - tick), tempo);
      tick = Math.max(tick, change.tick);
      tempo = change.tempo;
    }
    seconds += ticksToSeconds(end - tick, tempo);
    return { number: masterBar.index + 1, startTick: start, endTick: end, start: barStart, end: seconds };
  });
}

function ticksToSeconds(ticks: number, tempo: number): number {
  return (ticks / TICKS_PER_QUARTER) * (60 / tempo);
}

/**
 * When `tick` is played, in seconds, kept within the score. Within a bar the
 * time is spread evenly, which is exact unless the tempo changes mid-bar.
 */
export function secondsAtTick(bars: readonly NotationBar[], tick: number): number {
  const bar = bars.findLast(({ startTick }) => startTick <= tick) ?? bars[0];
  if (!bar) return 0;
  const share = Math.min(1, Math.max(0, (tick - bar.startTick) / (bar.endTick - bar.startTick || 1)));
  return bar.start + share * (bar.end - bar.start);
}

/** The tick played at `seconds`, kept within the score; the inverse of {@link secondsAtTick}. */
export function tickAtSeconds(bars: readonly NotationBar[], seconds: number): number {
  const bar = bars.findLast(({ start }) => start <= seconds) ?? bars[0];
  if (!bar) return 0;
  const share = Math.min(1, Math.max(0, (seconds - bar.start) / (bar.end - bar.start || 1)));
  return Math.round(bar.startTick + share * (bar.endTick - bar.startTick));
}
