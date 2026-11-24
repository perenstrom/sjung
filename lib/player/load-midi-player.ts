import { BasicMIDI } from "spessasynth_core";
import { type BasicSynthesizer, Sequencer, WorkletSynthesizer } from "spessasynth_lib";

import { barStartsOf } from "@/lib/player/midi-bars";
import { createMidiPlayer } from "@/lib/player/midi-player";
import type { Player } from "@/lib/player/player";
import { PLAYER_PROGRAMS } from "@/lib/player/soundfont";

/** SpessaSynth's AudioWorklet processor, copied to `public` by `scripts/copy-player-assets.mjs`. */
const MIDI_PROCESSOR_PATH = "/vendor/spessasynth_processor.min.js";

/** The General MIDI program every part is played with until Stämmor offers a choice. */
const PIANO = PLAYER_PROGRAMS[0].program;
/** General MIDI's percussion channel, which keeps its own sounds. */
const PERCUSSION_CHANNEL = 9;

/** An event listener id, unique to the player. */
const LISTENER = "sjung-player";

/**
 * Loads the MIDI file at `src` into SpessaSynth, played with the player's
 * soundfont at `soundfontSrc`, and returns its player. Only ever imported
 * dynamically, so SpessaSynth is downloaded only when a MIDI File is opened.
 * Rejects if anything fails to load, or with an `AbortError` once `signal`
 * aborts, having let go of everything it set up.
 */
export async function loadMidiPlayer({
  src,
  soundfontSrc,
  signal,
}: {
  src: string;
  soundfontSrc: string;
  signal: AbortSignal;
}): Promise<Player> {
  const [file, soundfont] = await Promise.all([fetchBuffer(src, signal), fetchBuffer(soundfontSrc, signal)]);
  const midi = BasicMIDI.fromArrayBuffer(file);

  playThroughSilentSwitch();
  const context = new AudioContext();
  let synth: WorkletSynthesizer | null = null;
  try {
    await context.audioWorklet.addModule(MIDI_PROCESSOR_PATH);
    synth = new WorkletSynthesizer(context);
    synth.connect(context.destination);
    await synth.soundBankManager.addSoundBank(soundfont, "player");
    await synth.isReady;
    signal.throwIfAborted();

    const sequencer = new Sequencer(synth, { skipToFirstNoteOn: false });
    const loaded = new Promise<void>((resolve) => sequencer.eventHandler.addEvent("songChange", LISTENER, () => resolve()));
    sequencer.loadNewSongList([midi]);
    await loaded;
    signal.throwIfAborted();
    playOnPiano(synth);

    const loadedSynth = synth;
    return createMidiPlayer(
      {
        get currentTime() {
          return sequencer.currentTime;
        },
        set currentTime(seconds) {
          sequencer.currentTime = seconds;
        },
        get paused() {
          return sequencer.paused;
        },
        get duration() {
          return sequencer.duration;
        },
        get playbackRate() {
          return sequencer.playbackRate;
        },
        set playbackRate(rate) {
          sequencer.playbackRate = rate;
        },
        play() {
          // Browsers start an AudioContext suspended until a tap or click resumes it.
          void context.resume();
          sequencer.play();
        },
        pause: () => sequencer.pause(),
        onEnded: (callback) => sequencer.eventHandler.addEvent("songEnded", LISTENER, callback),
        destroy() {
          loadedSynth.destroy();
          void context.close();
        },
      },
      { bars: barStartsOf(midi) }
    );
  } catch (error) {
    synth?.destroy();
    void context.close();
    throw error;
  }
}

async function fetchBuffer(url: string, signal: AbortSignal): Promise<ArrayBuffer> {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Could not fetch ${new URL(url).pathname}: ${response.status}`);
  return response.arrayBuffer();
}

/**
 * Locks every melodic channel to piano, so the file's own program changes
 * don't pick sounds the trimmed soundfont doesn't have.
 */
function playOnPiano(synth: BasicSynthesizer) {
  synth.midiChannels.forEach((channel, number) => {
    if (number % 16 === PERCUSSION_CHANNEL) return;
    synth.programChange(number, PIANO);
    channel.setSystemParameter("presetLock", true);
  });
}

/**
 * Web Audio is muted by an iPhone's silent switch unless the page says it
 * plays media, as an `<audio>` element does by itself (Safari 17+).
 */
function playThroughSilentSwitch() {
  const { audioSession } = navigator as Navigator & { audioSession?: { type: string } };
  if (audioSession) audioSession.type = "playback";
}
