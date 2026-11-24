# The player uses alphaTab for notation and SpessaSynth for MIDI

Status: accepted

Sjung's player (PER-443) plays MIDI files and notation files: MusicXML, `.mxl`, and `.mscz` once it has been converted to `.mxl` (ADR-0009). The two are played by different engines. alphaTab handles every notation format: it draws the score, plays it and moves the cursor along it. SpessaSynth plays MIDI files, and they get no score. Both sit behind one small player interface (play, seek, tempo, A–B loop, list of parts, gain per part), so the player view doesn't know which engine is running. Both engines read SF3, so they share one soundfont: GeneralUser GS, trimmed to piano, choir aahs and voice oohs and stored on R2. We accept two engines because neither can do both jobs. alphaTab is the only open-source library that draws, plays, follows and mixes a score, but it cannot read a MIDI file. SpessaSynth plays MIDI faithfully, with mixing per track, but draws nothing.

## Considered options

- **Our own score model fed by an importer per format, played with oscillators and drawn with VexFlow** (as Notrummet does). Rejected: we would own all the music-reading and drawing code, and oscillators sound like a synth rather than a piano or a choir.
- **alphaTab for MIDI as well, by building its MIDI input in code and playing it through `loadMidiFile`.** Rejected: this gives no score or cursor either, per-channel mixing without a score is unproven, and we would own the glue code.
- **Converting MIDI to MusicXML (in the MuseScore worker, or with our own quantiser) so that alphaTab is the only engine.** Not now: MIDI would depend on the worker, which the slice order brings in last, and the quantised notation may look messy. The MuseScore worker route stays open as a later step that would give MIDI files a score.
- **Verovio for drawing the score.** Rejected after a prototype with real choir files on a phone (PER-464). alphaTab's lyrics were readable once we add the hyphens ourselves, even though melisma lines are missing and the verse lines don't quite share a baseline.

## Consequences

- alphaTab mixes per track, not per voice. So after import, every staff with two voices gets one hidden track per voice, and the drawn track is muted. The prototype showed that these parts ("Women 1", "Women 2") work with solo, mute, the A–B loop and the cursor. Each heard track needs its own MIDI channel, so a score can have at most 14 parts. Staves are split in order only while the parts fit, and the rest stay one part each. Where a lower voice has nothing in a bar, its part plays the upper voice there, since a unison is often written once.
- alphaTab's MusicXML import gets parts of real choir scores wrong, so Sjung adjusts each score when loading it:
  - Bars shorter than their time signature are marked as short. MuseScore doesn't mark a counted pickup or a bar split around a repeat, and alphaTab pads such bars with silence.
  - Each note's verses are sorted by number. alphaTab orders verse lines by first appearance, and MuseScore can write verse 1, 3, 2.
  - A D.S. or D.C. becomes "al Coda" or "al Fine" when the score has a To Coda or Fine. alphaTab reads every D.S. and D.C. as plain, so it never takes the coda and never stops at Fine.
  - The Piano / Kör switch also rewrites the instrument change alphaTab puts on each track's first beat, which otherwise overrides the track's sound.
  - A hyphen is added after each syllable that continues on the next note.
- alphaTab requires its "♪ alphaTab.net" attribution to stay visible in the drawn score. Removing it needs the maintainers' permission.
- A MIDI file mixes by the tracks it was exported with. MuseScore's MIDI export merges both voices on a staff into one track. SpessaSynth mixes per channel, so a track is mixed through the gain of the channels it plays on (PER-472). Two tracks that share a channel are heard as loud as the louder of them, and muting one of them alone silences nothing.
- The player's controls are written against the shared interface. An engine-specific feature has to fit that interface or stay out. The view knows which engine a File has only to start it, and to pick what stands in for a missing score: the no-score note, and the strip on desktop (a waveform for audio, a plain bar for MIDI). Bars belong to the interface: an engine that knows them reports when each starts, and the controls then show and step by bar.
- An audio File is played by one plain `<audio>` element, with no decoding and no Web Audio. The one exception is the waveform strip on desktop (PER-469): the browser downloads the whole file a second time and decodes it, only to work out the bar heights. This roughly doubles the download and briefly holds the decoded file in memory (about 100 MB for five minutes of stereo). It happens only at desktop width, and only after the player has opened. It also needs a CORS rule on the bucket that allows `GET`. If large files make this too costly, the bar heights can be worked out on the server after upload and stored as a derived copy of the File, as the `.mscz` conversion does (ADR-0009).
