"use client";

import { ChevronDown, Music, Repeat, SlidersHorizontal, Timer, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

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
  const midi = useMidiPlayer(engine === "midi" ? file.src : null, soundfontSrc);
  const player = engine === "audio" ? audioPlayer : midi.player;

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
        snapshot={midi.failed ? FAILED_SNAPSHOT : playerSnapshot}
        player={player}
        peaks={peaks}
      />
      {engine === "audio" ? <audio ref={attachAudio} src={file.src} preload="metadata" /> : null}
    </>
  );
}

/**
 * The MIDI engine for the file at `src`, played with the soundfont at
 * `soundfontSrc`; nothing for `null`. SpessaSynth is imported only here, so
 * it is downloaded only once a MIDI File is opened. `failed` once the file,
 * the soundfont or the synthesizer couldn't be loaded.
 */
function useMidiPlayer(src: string | null, soundfontSrc: string | null) {
  const [player, setPlayer] = useState<Player | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (src === null) return;
    const controller = new AbortController();
    let loaded: Player | null = null;
    import("@/lib/player/load-midi-player")
      .then(({ loadMidiPlayer }) => {
        if (soundfontSrc === null) throw new Error("A MIDI File needs the player's soundfont");
        return loadMidiPlayer({ src, soundfontSrc, signal: controller.signal });
      })
      .then(
        (midiPlayer) => {
          if (controller.signal.aborted) return midiPlayer.destroy();
          loaded = midiPlayer;
          setPlayer(midiPlayer);
        },
        (error: unknown) => {
          if (controller.signal.aborted) return;
          console.error("Kunde inte ladda MIDI-filen", error);
          setFailed(true);
        },
      );
    return () => {
      controller.abort();
      loaded?.destroy();
      setPlayer(null);
    };
  }, [src, soundfontSrc]);
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
 * its waveform `peaks` and keyboard shortcuts from `md` up.
 */
export function PlayerScreen({
  pieceName,
  file,
  files,
  closeHref,
  snapshot,
  player,
  peaks,
}: {
  pieceName: string;
  file: Pick<PlayerFileOption, "id" | "displayName" | "formatLabel"> & { engine: PlayerEngine };
  files: readonly PlayerFileOption[];
  closeHref: string;
  snapshot: PlayerSnapshot;
  player: Player | null;
  peaks: readonly number[] | null;
}) {
  const router = useRouter();
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

      <footer className="border-t bg-background px-4 pt-2 pb-[max(env(safe-area-inset-bottom),12px)] md:hidden">
        <SeekBar
          position={snapshot.position}
          duration={snapshot.duration}
          bars={snapshot.bars}
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
