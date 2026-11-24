"use client";

import { ChevronDown, Music, Repeat, SlidersHorizontal, Timer, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import type { PlayerEngine } from "@/lib/file-formats";
import { createAudioPlayer } from "@/lib/player/audio-player";
import {
  DEFAULT_TEMPO,
  IDLE_SNAPSHOT,
  isRepeating,
  markLoop,
  type Player,
  type PlayerSnapshot,
} from "@/lib/player/player";
import { mixChanged } from "@/lib/player/mix";
import { loadWaveform } from "@/lib/player/waveform";
import type { PlayerData, PlayerFileOption } from "@/lib/pieces/player";

import { closePlayer } from "./closePlayer";
import {
  DockButton,
  NoScoreNote,
  PartsControls,
  PlayButton,
  type PlayerPanel,
  RepeatControls,
  SeekBar,
  TempoControls,
} from "./controls";
import {
  DesktopTransport,
  NoScoreStrip,
  ShortcutHud,
  ShortcutsButton,
  ShortcutsDialog,
  WAVEFORM_BARS,
} from "./desktop";
import { ScoreArea } from "./score";
import { useShortcuts } from "./useShortcuts";

type PlayerViewProps = PlayerData;

const noSubscription = () => () => {};

const FAILED_SNAPSHOT: PlayerSnapshot = { ...IDLE_SNAPSHOT, status: "error" };

/**
 * The player, full screen over the app, open on one of a Piece's Playable
 * Files. It talks to the File's engine only through `Player`. Switching File
 * opens the player anew, so nothing carries over, as between visits.
 */
export function PlayerView({ pieceName, file, soundfontSrc, files, closeHref }: PlayerViewProps) {
  const { engine } = file.format;
  const [audioPlayer, setAudioPlayer] = useState<Player | null>(null);
  const attachAudio = useCallback((audio: HTMLAudioElement) => {
    const created = createAudioPlayer(audio);
    setAudioPlayer(created);
    return () => {
      created.destroy();
      setAudioPlayer(null);
    };
  }, []);
  const [scoreElement, setScoreElement] = useState<HTMLDivElement | null>(null);
  const load = useMemo(
    () => engineLoader({ engine, src: file.src, soundfontSrc, scoreElement }),
    [engine, file.src, soundfontSrc, scoreElement],
  );
  const loaded = useLoadedPlayer(load);
  const player = engine === "audio" ? audioPlayer : loaded.player;

  const playerSnapshot = useSyncExternalStore(
    player?.subscribe ?? noSubscription,
    () => player?.getSnapshot() ?? IDLE_SNAPSHOT,
    () => IDLE_SNAPSHOT,
  );
  const peaks = useWaveform(engine === "audio" ? file.src : null);

  return (
    <>
      <PlayerScreen
        pieceName={pieceName}
        file={{ id: file.id, displayName: file.displayName, formatLabel: file.format.label, engine }}
        files={files}
        closeHref={closeHref}
        snapshot={loaded.failed ? FAILED_SNAPSHOT : playerSnapshot}
        player={player}
        peaks={peaks}
        attachScore={setScoreElement}
      />
      {engine === "audio" ? <audio ref={attachAudio} src={file.src} preload="metadata" /> : null}
    </>
  );
}

/** Loads an engine's player; it rejects with an `AbortError` once `signal` aborts. */
type LoadPlayer = (signal: AbortSignal) => Promise<Player>;

/**
 * How to load the engine for a MIDI or notation File, which needs the
 * player's soundfont, and for notation the element to draw the score in
 * once it is there; `null` for audio, or until then. Each engine is imported
 * only here, so it is downloaded only once a File that needs it is opened.
 */
function engineLoader({
  engine,
  src,
  soundfontSrc,
  scoreElement,
}: {
  engine: PlayerEngine;
  src: string;
  soundfontSrc: string | null;
  scoreElement: HTMLElement | null;
}): LoadPlayer | null {
  const needSoundfont = () => {
    if (soundfontSrc === null) throw new Error("A MIDI or notation File needs the player's soundfont");
    return soundfontSrc;
  };
  switch (engine) {
    case "audio":
      return null;
    case "midi":
      return async (signal) => {
        const { loadMidiPlayer } = await import("@/lib/player/load-midi-player");
        return loadMidiPlayer({ src, soundfontSrc: needSoundfont(), signal });
      };
    case "notation": {
      const scrollElement = scoreElement?.closest<HTMLElement>("[data-score-scroll]");
      if (!scoreElement || !scrollElement) return null;
      return async (signal) => {
        const { loadNotationPlayer } = await import("@/lib/player/load-notation-player");
        return loadNotationPlayer({ src, soundfontSrc: needSoundfont(), element: scoreElement, scrollElement, signal });
      };
    }
  }
}

/**
 * The player `load` gives, once loaded; nothing for `null`. `failed` once
 * the file, the soundfont or the engine couldn't be loaded.
 */
function useLoadedPlayer(load: LoadPlayer | null) {
  const [player, setPlayer] = useState<Player | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (load === null) return;
    const controller = new AbortController();
    let loaded: Player | null = null;
    load(controller.signal).then(
      (created) => {
        if (controller.signal.aborted) return created.destroy();
        loaded = created;
        setPlayer(created);
      },
      (error: unknown) => {
        if (controller.signal.aborted) return;
        console.error("Kunde inte ladda filen", error);
        setFailed(true);
      },
    );
    return () => {
      controller.abort();
      loaded?.destroy();
      setPlayer(null);
    };
  }, [load]);
  return { player, failed };
}

/** Desktop and tablet width, where the player has its wide layout (Tailwind's `md`). */
const WIDE_QUERY = "(min-width: 768px)";

/**
 * The audio File's waveform for the strip on desktop, or `null` until it
 * is decoded, or for a File that isn't audio (`src` is `null`). Only fetched at desktop width, where the strip shows; if it can't
 * be fetched or decoded the strip stays flat.
 */
function useWaveform(src: string | null): number[] | null {
  const isMobile = useIsMobile();
  const [peaks, setPeaks] = useState<number[] | null>(null);
  useEffect(() => {
    if (src === null || peaks || isMobile || !window.matchMedia(WIDE_QUERY).matches) return;
    const controller = new AbortController();
    loadWaveform(src, WAVEFORM_BARS, controller.signal).then(setPeaks, (error: unknown) => {
      if (!controller.signal.aborted) console.warn("Kunde inte rita vågformen", error);
    });
    return () => controller.abort();
  }, [peaks, isMobile, src]);
  return peaks;
}

const SHEET_TITLES: Record<PlayerPanel, string> = { tempo: "Tempo", repeat: "Repetera", parts: "Stämmor" };

/**
 * What the player shows for a snapshot; `player` is `null` until the engine
 * is ready to take commands. Phone layout below `md`, the wide layout with
 * its waveform `peaks` and keyboard shortcuts from `md` up. A notation File's
 * score is drawn in the element given to `attachScore`.
 */
export function PlayerScreen({
  pieceName,
  file,
  files,
  closeHref,
  snapshot,
  player,
  peaks,
  attachScore,
}: {
  pieceName: string;
  file: Pick<PlayerFileOption, "id" | "displayName" | "formatLabel"> & { engine: PlayerEngine };
  files: readonly PlayerFileOption[];
  closeHref: string;
  snapshot: PlayerSnapshot;
  player: Player | null;
  peaks: readonly number[] | null;
  attachScore?: (element: HTMLDivElement | null) => void;
}) {
  const router = useRouter();
  const hasScore = file.engine === "notation";
  const [sheet, setSheet] = useState<PlayerPanel | null>(null);
  const [panel, setPanel] = useState<PlayerPanel | null>(null);
  // The singer's own part in Stämmor, for this visit only.
  const [mine, setMine] = useState<string | null>(null);
  const shortcuts = useShortcuts({ player, snapshot, layerOpen: sheet !== null || panel !== null });

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <header className="flex items-center gap-2 border-b px-3 py-2">
        <Link
          href={closeHref}
          onClick={(event) => {
            event.preventDefault();
            closePlayer(router, closeHref);
          }}
          aria-label="Stäng spelaren"
          className="-ml-1 rounded-full p-2 hover:bg-muted"
        >
          <X className="size-5" aria-hidden />
        </Link>
        {/* The File switcher covers the whole title, so a tap anywhere on it opens the list. */}
        <div className="relative min-w-0 flex-1 rounded-md py-1 has-[select:focus-visible]:ring-2 has-[select:focus-visible]:ring-ring">
          <p className="truncate text-sm font-medium">{pieceName}</p>
          <p className="flex items-center gap-1 text-xs text-muted-foreground" aria-hidden>
            <span className="truncate">{file.displayName}</span>
            <ChevronDown className="size-3 shrink-0" />
          </p>
          <select
            aria-label="Fil"
            value={file.id}
            onChange={(event) => {
              const option = files.find(({ id }) => id === event.target.value);
              if (option) router.replace(option.href, { scroll: false });
            }}
            className="absolute inset-0 size-full cursor-pointer appearance-none opacity-0"
          >
            {files.map((option) => (
              <option key={option.id} value={option.id}>
                {option.displayName}
              </option>
            ))}
          </select>
        </div>
        <span className="shrink-0 rounded border px-1.5 py-0.5 text-[10px] tracking-wide text-muted-foreground uppercase">
          {file.formatLabel}
        </span>
        <ShortcutsButton onClick={() => shortcuts.setHelpOpen(true)} className="hidden md:flex" />
      </header>

      {/* Not a <main>: the player opens inside the app's own. */}
      {file.engine === "notation" ? (
        <ScoreArea status={snapshot.status} attach={attachScore} />
      ) : (
        <>
          <div className="grid min-h-0 flex-1 place-items-center overflow-y-auto px-6 py-3 md:hidden">
            <div className="space-y-3 text-center">
              <Music className="mx-auto size-16 text-muted-foreground/40" aria-hidden />
              <p className="font-medium break-words">{file.displayName}</p>
              <NoScoreNote status={snapshot.status} engine={file.engine} />
            </div>
          </div>
          <div className="hidden min-h-0 flex-1 overflow-y-auto bg-muted/30 md:block">
            <NoScoreStrip
              name={file.displayName}
              engine={file.engine}
              snapshot={snapshot}
              peaks={peaks}
              onSeek={(seconds) => player?.seek(seconds)}
            />
          </div>
        </>
      )}

      <footer className="border-t bg-background px-4 pt-2 pb-[max(env(safe-area-inset-bottom),12px)] md:hidden">
        <SeekBar
          position={snapshot.position}
          duration={snapshot.duration}
          bars={snapshot.bars}
          barNumbers={snapshot.barNumbers}
          loop={snapshot.loop}
          onSeek={(seconds) => player?.seek(seconds)}
        />
        <div className="mt-1 grid grid-cols-5 place-items-center">
          <DockButton
            icon={<Timer className="size-5" aria-hidden />}
            label={`${snapshot.tempo} %`}
            active={snapshot.tempo !== DEFAULT_TEMPO}
            onClick={() => setSheet("tempo")}
          />
          <DockButton
            icon={<Repeat className="size-5" aria-hidden />}
            label="Repetera"
            active={isRepeating(snapshot.loop)}
            onClick={() => setSheet("repeat")}
          />
          <PlayButton playing={snapshot.playing} player={player} />
          {snapshot.parts.length > 0 ? (
            <DockButton
              icon={<SlidersHorizontal className="size-5" aria-hidden />}
              label="Stämmor"
              active={mixChanged(snapshot.parts, snapshot.sound)}
              onClick={() => setSheet("parts")}
            />
          ) : null}
        </div>
      </footer>
      <DesktopTransport
        snapshot={snapshot}
        hasScore={hasScore}
        player={player}
        panel={panel}
        onPanel={setPanel}
        mine={mine}
        onMine={setMine}
      />

      <ShortcutHud message={shortcuts.hud} />
      <ShortcutsDialog
        open={shortcuts.helpOpen}
        onOpenChange={shortcuts.setHelpOpen}
        hasBars={snapshot.bars.length > 0}
        hasParts={snapshot.parts.length > 0}
      />

      <Sheet open={sheet !== null} onOpenChange={(open) => !open && setSheet(null)}>
        <SheetContent side="bottom" className="max-h-[80dvh] rounded-t-2xl" aria-describedby={undefined}>
          <SheetHeader className="pb-0">
            <SheetTitle>{sheet === null ? null : SHEET_TITLES[sheet]}</SheetTitle>
          </SheetHeader>
          <div className="overflow-y-auto px-4 pb-6">
            {sheet === "tempo" ? (
              <TempoControls tempo={snapshot.tempo} onTempo={(percent) => player?.setTempo(percent)} />
            ) : null}
            {sheet === "repeat" ? (
              <RepeatControls
                loop={snapshot.loop}
                score={hasScore ? snapshot : null}
                onMark={() => player?.setLoop(markLoop(snapshot.loop, snapshot.position))}
                onStop={() => player?.setLoop(null)}
              />
            ) : null}
            {sheet === "parts" ? (
              <PartsControls
                parts={snapshot.parts}
                sound={snapshot.sound}
                mine={mine}
                onMine={setMine}
                player={player}
                numbered={false}
              />
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
