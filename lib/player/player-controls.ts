import {
  applyMix,
  audibleGain,
  type MixPreset,
  MIX_PRESETS,
  mixChanged,
  type PartMix,
  presetMix,
  presetOf,
  presetOnChoosing,
} from "@/lib/player/mix";
import {
  barAt,
  barNumber,
  barNumberAt,
  clampTempo,
  DEFAULT_TEMPO,
  formatTime,
  IDLE_SNAPSHOT,
  isRepeating,
  type Passage,
  passageBarsLabel,
  type Player,
  type PlayerPart,
  type PlayerSnapshot,
  type PlayerSound,
} from "@/lib/player/player";

/** How far one step of the tempo moves it, in percent: − / + and the slider. */
export const TEMPO_STEP = 5;
/** How far one step moves the playhead in a file without bars, in seconds. */
const STEP_SECONDS_WITHOUT_BARS = 5;

/** What the singer asks the player to do, from a button or a key. */
export type PlayerCommand =
  | { type: "togglePlay" }
  /** `by` bars forward (or back, below 0); `by` × 5 s in a file without bars. */
  | { type: "stepBars"; by: number }
  | { type: "seek"; seconds: number }
  /** To the start of the passage that repeats, or of the file. */
  | { type: "rewind" }
  | { type: "markStart" }
  | { type: "markEnd" }
  | { type: "stopRepeating" }
  | { type: "stepTempo"; by: number }
  | { type: "setTempo"; percent: number }
  /** Solo on part `number` (counted from 1), or off again. */
  | { type: "toggleSolo"; number: number }
  | { type: "setPart"; partId: string; change: Partial<PartMix> }
  /** The singer's own part (Min stämma), or `null` to let go of it. */
  | { type: "chooseMine"; partId: string | null }
  | { type: "applyPreset"; preset: MixPreset }
  | { type: "setSound"; sound: PlayerSound };

/** One part as the mixer shows it: `heard` unless it is muted or another is soloed. */
export type PartView = PlayerPart & { heard: boolean };

/** What the player's controls show, whichever layout shows them. */
export type PlayerControlsView = {
  status: PlayerSnapshot["status"];
  playing: boolean;
  /** Whether the file has bars, so the playhead steps and passages are marked by bar. */
  hasBars: boolean;
  playhead: {
    position: number;
    duration: number;
    /** The playhead's time, m:ss. */
    time: string;
    /** "takt 12" in a file with bars, the number the score gives it. */
    bar: string | null;
    /** The time, and the bar in a file with bars: "1:23 · takt 12". */
    label: string;
    /** The file's length, m:ss. */
    length: string;
  };
  tempo: { percent: number; changed: boolean };
  passage: {
    /** The passage, to shade along the file. */
    range: Passage | null;
    /** The passage once it repeats: "takt 16–19", or "0:12–0:30" by time. */
    label: string | null;
    /** What Repetera says about it, and how to mark one. */
    status: string;
    repeating: boolean;
    /** Only its start is set: the end is still to mark. */
    marking: boolean;
    /** The button that marks it at the playhead; `null` where the singer taps bars in the score. */
    markButton: "Start här" | "Slut här" | null;
  };
  parts: {
    /** Whether the file has parts to mix, so Stämmor is offered. */
    shown: boolean;
    /** The sound or the mix is changed from the default. */
    changed: boolean;
    /** The preset the parts are mixed as, `null` once changed by hand. */
    preset: MixPreset | null;
    mine: string | null;
    sound: PlayerSound;
    list: readonly PartView[];
  };
};

/** How the player's file is marked: `scoreTakesTaps` where a drawn score marks a passage by tapping its bars. */
export type ControlsOptions = { scoreTakesTaps: boolean };

/**
 * The player's controls over `player`, for the phone dock, the desktop
 * transport and the keys alike: what they show (`getView`) and what the
 * singer asks of them (`run`). It keeps the singer's own part for the visit.
 */
export type PlayerControls = {
  /** What the controls show now. The same object until something changes. */
  getView(): PlayerControlsView;
  /** Calls `listener` whenever the view changes; returns how to stop. */
  subscribe(listener: () => void): () => void;
  /** Does `command`, and says in a few words what it did; `null` when there is nothing to say. */
  run(command: PlayerCommand): string | null;
};

export function createPlayerControls(player: Player, options: ControlsOptions): PlayerControls {
  let mine: string | null = null;
  let snapshot = player.getSnapshot();
  let view = controlsView(snapshot, { mine, ...options });
  const listeners = new Set<() => void>();

  function getView() {
    const current = player.getSnapshot();
    if (current !== snapshot) {
      snapshot = current;
      view = controlsView(snapshot, { mine, ...options });
    }
    return view;
  }

  function setMine(partId: string | null) {
    mine = partId;
    view = controlsView(snapshot, { mine, ...options });
    for (const listener of listeners) listener();
  }

  return {
    getView,
    subscribe(listener) {
      listeners.add(listener);
      const unsubscribe = player.subscribe(listener);
      return () => {
        listeners.delete(listener);
        unsubscribe();
      };
    },
    run(command) {
      return runCommand(player, player.getSnapshot(), command, { mine, setMine });
    },
  };
}

function runCommand(
  player: Player,
  snapshot: PlayerSnapshot,
  command: PlayerCommand,
  { mine, setMine }: { mine: string | null; setMine: (partId: string | null) => void },
): string | null {
  const { position, duration, passage, playing, tempo, bars, barNumbers, parts } = snapshot;
  switch (command.type) {
    case "togglePlay":
      if (playing) {
        player.pause();
        return "Paus";
      }
      player.play();
      return "Spelar";
    case "stepBars": {
      if (bars.length > 0) {
        const target = Math.min(bars.length, Math.max(1, (barAt(bars, position) ?? 1) + command.by));
        player.seek(bars[target - 1]);
        return `Takt ${barNumber(barNumbers, target)}`;
      }
      const step = command.by * STEP_SECONDS_WITHOUT_BARS;
      player.seek(Math.min(duration, Math.max(0, position + step)));
      return `${step > 0 ? "+" : "−"}${Math.abs(step)} s`;
    }
    case "seek":
      player.seek(command.seconds);
      return null;
    case "rewind":
      if (isRepeating(passage)) {
        player.seek(passage.start);
        return "Till repetitionens start";
      }
      player.seek(0);
      return "Till början";
    case "markStart":
      return setMarked(player, startAt(passage, bars.length > 0 ? barStartAt(bars, position) : position), snapshot);
    case "markEnd": {
      const marked =
        bars.length > 0 ? endAtBar(passage, barAt(bars, position) ?? 1, { bars, duration }) : endAt(passage, position);
      return marked ? setMarked(player, marked, snapshot) : "Sätt slutet efter starten";
    }
    case "stopRepeating":
      if (passage === null) return null;
      player.setPassage(null);
      return "Repeterar inte längre";
    case "stepTempo":
    case "setTempo": {
      const percent = clampTempo(command.type === "setTempo" ? command.percent : tempo + command.by * TEMPO_STEP);
      player.setTempo(percent);
      return `Tempo ${percent} %`;
    }
    case "toggleSolo": {
      const part = parts[command.number - 1];
      if (!part) return null;
      player.setPart(part.id, { solo: !part.solo });
      return `${part.solo ? "Solo av" : "Solo"}: ${part.name}`;
    }
    case "setPart":
      player.setPart(command.partId, command.change);
      return null;
    case "chooseMine":
      applyMix(player, presetMix(presetOnChoosing(parts, mine, command.partId), parts, command.partId));
      setMine(command.partId);
      return null;
    case "applyPreset":
      applyMix(player, presetMix(command.preset, parts, mine));
      return command.preset === "equal"
        ? "Alla stämmor lika"
        : (MIX_PRESETS.find(({ preset }) => preset === command.preset)?.label ?? null);
    case "setSound":
      player.setSound(command.sound);
      return null;
  }
}

/** Sets `passage` on `player`, and says so, by bar in a file with bars. */
function setMarked(player: Player, passage: Passage, { bars, barNumbers }: PlayerSnapshot): string {
  player.setPassage(passage);
  if (isRepeating(passage)) {
    return `Repeterar ${bars.length > 0 ? `takt ${passageBarsLabel(passage, bars, barNumbers)}` : timeRange(passage)}`;
  }
  return bars.length > 0
    ? `Repetera från takt ${barNumberAt(bars, barNumbers, passage.start)} – tryck B vid slutet`
    : "Repetera härifrån – tryck B vid slutet";
}

/** What the controls show for `snapshot`, with `mine` as the singer's own part. */
export function controlsView(
  snapshot: PlayerSnapshot,
  { mine, scoreTakesTaps }: ControlsOptions & { mine: string | null },
): PlayerControlsView {
  const { position, duration, passage, bars, barNumbers, parts, sound } = snapshot;
  const bar = barNumberAt(bars, barNumbers, position);
  const time = formatTime(position);
  return {
    status: snapshot.status,
    playing: snapshot.playing,
    hasBars: bars.length > 0,
    playhead: {
      position,
      duration,
      time,
      bar: bar === null ? null : `takt ${bar}`,
      label: bar === null ? time : `${time} · takt ${bar}`,
      length: formatTime(duration),
    },
    tempo: { percent: snapshot.tempo, changed: snapshot.tempo !== DEFAULT_TEMPO },
    passage: {
      range: passage,
      label: isRepeating(passage) ? passageLabel(passage, bars, barNumbers) : null,
      status: passageStatus(passage, { bars, barNumbers, scoreTakesTaps }),
      repeating: isRepeating(passage),
      marking: passage !== null && passage.end === null,
      markButton: scoreTakesTaps ? null : passage !== null && passage.end === null ? "Slut här" : "Start här",
    },
    parts: {
      shown: parts.length > 0,
      changed: mixChanged(parts, sound),
      preset: presetOf(parts, mine),
      mine,
      sound,
      list: parts.map((part) => ({ ...part, heard: audibleGain(part, parts) > 0 })),
    },
  };
}

/** What controls show before the player has loaded, or once it `failed` to. */
export function idleControlsView({ failed, scoreTakesTaps }: { failed: boolean } & ControlsOptions) {
  return controlsView(failed ? { ...IDLE_SNAPSHOT, status: "error" } : IDLE_SNAPSHOT, { mine: null, scoreTakesTaps });
}

/** A passage that repeats, by bar in a file with bars and by time otherwise. */
function passageLabel(passage: Passage & { end: number }, bars: readonly number[], barNumbers: readonly number[]) {
  return bars.length > 0 ? `takt ${passageBarsLabel(passage, bars, barNumbers)}` : timeRange(passage);
}

function timeRange({ start, end }: { start: number; end: number }) {
  return `${formatTime(start)}–${formatTime(end)}`;
}

/** What Repetera says about the passage, and how to mark one: with the buttons, or by tapping bars. */
function passageStatus(
  passage: Passage | null,
  {
    bars,
    barNumbers,
    scoreTakesTaps,
  }: { bars: readonly number[]; barNumbers: readonly number[]; scoreTakesTaps: boolean },
): string {
  if (isRepeating(passage)) return `Repeterar ${passageLabel(passage, bars, barNumbers)}`;
  if (scoreTakesTaps) {
    return passage === null
      ? "Tryck på en takt i noterna där avsnittet börjar."
      : `Start: takt ${barNumberAt(bars, barNumbers, passage.start)}. Tryck på takten där avsnittet slutar.`;
  }
  if (passage === null) return "Sätt start och slut för att repetera ett avsnitt.";
  const start =
    bars.length > 0 ? `: takt ${barNumberAt(bars, barNumbers, passage.start)}` : ` ${formatTime(passage.start)}`;
  return `Start${start}. Sätt slutet där avsnittet slutar.`;
}

/** When the bar `seconds` falls in starts. */
function barStartAt(bars: readonly number[], seconds: number): number {
  return bars[(barAt(bars, seconds) ?? 1) - 1];
}

/** The passage starting at `seconds`, keeping the end of `passage` if that is still after it. */
export function startAt(passage: Passage | null, seconds: number): Passage {
  return { start: seconds, end: isRepeating(passage) && passage.end > seconds ? passage.end : null };
}

/** The passage starting at bar `bar` (counted from 1), keeping a later end of `passage`. */
export function startAtBar(passage: Passage | null, bar: number, bars: readonly number[]): Passage {
  return startAt(passage, bars[bar - 1]);
}

/**
 * The passage ending at `seconds`, from the start of `passage` or of the
 * file, in whichever order they come; `null` for an end at the start.
 */
export function endAt(passage: Passage | null, seconds: number): Passage | null {
  const start = passage?.start ?? 0;
  if (seconds === start) return null;
  return seconds > start ? { start, end: seconds } : { start: seconds, end: start };
}

/**
 * The passage over whole bars from the bar `passage` starts in (or the
 * first) to the end of bar `bar` (counted from 1), in whichever order they
 * come. A bar ends where the next starts, or the last at `duration`.
 */
export function endAtBar(
  passage: Passage | null,
  bar: number,
  { bars, duration }: { bars: readonly number[]; duration: number },
): Passage {
  const marked = barAt(bars, passage?.start ?? 0) ?? 1;
  const [first, last] = marked <= bar ? [marked, bar] : [bar, marked];
  return { start: bars[first - 1], end: bars[last] ?? duration };
}
