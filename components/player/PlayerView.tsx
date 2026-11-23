"use client";

import { ChevronDown, Music, Repeat, Timer, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState, useSyncExternalStore } from "react";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { createAudioPlayer } from "@/lib/player/audio-player";
import { DEFAULT_TEMPO, IDLE_SNAPSHOT, markLoop, type Player, type PlayerSnapshot } from "@/lib/player/player";
import type { PlayerData, PlayerFileOption } from "@/lib/pieces/player";

import { closePlayer } from "./closePlayer";
import { DockButton, PlayButton, RepeatControls, SeekBar, TempoControls } from "./controls";

type PlayerViewProps = PlayerData;

const noSubscription = () => () => {};

/**
 * The player, full screen over the app, open on one of a Piece's Playable
 * Files. It talks to the File's engine only through `Player`. Switching File
 * opens the player anew, so nothing carries over, as between visits.
 */
export function PlayerView({ pieceName, file, files, closeHref }: PlayerViewProps) {
  const [player, setPlayer] = useState<Player | null>(null);
  const attachAudio = useCallback((audio: HTMLAudioElement) => {
    const audioPlayer = createAudioPlayer(audio);
    setPlayer(audioPlayer);
    return () => {
      audioPlayer.destroy();
      setPlayer(null);
    };
  }, []);

  const snapshot = useSyncExternalStore(
    player?.subscribe ?? noSubscription,
    () => player?.getSnapshot() ?? IDLE_SNAPSHOT,
    () => IDLE_SNAPSHOT
  );

  return (
    <>
      <PlayerScreen
        pieceName={pieceName}
        file={{ id: file.id, displayName: file.displayName, formatLabel: file.format.label }}
        files={files}
        closeHref={closeHref}
        snapshot={snapshot}
        player={player}
      />
      <audio ref={attachAudio} src={file.src} preload="metadata" />
    </>
  );
}

type SheetKey = "tempo" | "repeat";

const SHEET_TITLES: Record<SheetKey, string> = { tempo: "Tempo", repeat: "Repetera" };

/** What the player shows for a snapshot; `player` is `null` until the engine is ready to take commands. */
export function PlayerScreen({
  pieceName,
  file,
  files,
  closeHref,
  snapshot,
  player,
}: {
  pieceName: string;
  file: Pick<PlayerFileOption, "id" | "displayName" | "formatLabel">;
  files: readonly PlayerFileOption[];
  closeHref: string;
  snapshot: PlayerSnapshot;
  player: Player | null;
}) {
  const router = useRouter();
  const [sheet, setSheet] = useState<SheetKey | null>(null);

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
      </header>

      {/* Not a <main>: the player opens inside the app's own. */}
      <div className="grid min-h-0 flex-1 place-items-center overflow-y-auto px-6 py-3">
        <div className="space-y-3 text-center">
          <Music className="mx-auto size-16 text-muted-foreground/40" aria-hidden />
          <p className="font-medium break-words">{file.displayName}</p>
          {snapshot.status === "error" ? (
            <p className="text-sm text-destructive">Filen kunde inte spelas upp.</p>
          ) : (
            <p className="text-sm text-muted-foreground">Ljudfil – inga noter att visa.</p>
          )}
        </div>
      </div>

      <footer className="border-t bg-background px-4 pt-2 pb-[max(env(safe-area-inset-bottom),12px)]">
        <SeekBar
          position={snapshot.position}
          duration={snapshot.duration}
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
            active={snapshot.loop?.end != null}
            onClick={() => setSheet("repeat")}
          />
          <PlayButton
            playing={snapshot.playing}
            onToggle={() => (snapshot.playing ? player?.pause() : player?.play())}
          />
        </div>
      </footer>

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
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
