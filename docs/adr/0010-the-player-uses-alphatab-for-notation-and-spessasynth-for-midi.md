# The player uses alphaTab for notation and SpessaSynth for MIDI

Status: accepted

Sjung's player (PER-443) plays MIDI files and notation files: MusicXML, `.mxl`, and `.mscz` once it has been converted to `.mxl` (ADR-0009). The two are played by different engines. alphaTab handles every notation format: it draws the score, plays it and moves the cursor along it. SpessaSynth plays MIDI files, and they get no score. Both sit behind one small player interface (play, seek, tempo, A–B loop, list of parts, gain per part), so the player view doesn't know which engine is running. Both engines read SF3, so they share one soundfont: GeneralUser GS, trimmed to piano, choir aahs and voice oohs and stored on R2. We accept two engines because neither can do both jobs. alphaTab is the only open-source library that draws, plays, follows and mixes a score, but it cannot read a MIDI file. SpessaSynth plays MIDI faithfully, with mixing per track, but draws nothing.

## Considered options

- **Our own score model fed by an importer per format, played with oscillators and drawn with VexFlow** (as Notrummet does). Rejected: we would own all the music-reading and drawing code, and oscillators sound like a synth rather than a piano or a choir.
- **alphaTab for MIDI as well, by building its MIDI input in code and playing it through `loadMidiFile`.** Rejected: this gives no score or cursor either, per-channel mixing without a score is unproven, and we would own the glue code.
- **Converting MIDI to MusicXML (in the MuseScore worker, or with our own quantiser) so that alphaTab is the only engine.** Not now: MIDI would depend on the worker, which the slice order brings in last, and the quantised notation may look messy. The MuseScore worker route stays open as a later step that would give MIDI files a score.
- **Verovio for drawing the score.** Kept as the fallback if alphaTab's choir lyrics, which have no hyphens or melisma lines, turn out to be unacceptable on real files.

## Consequences

- alphaTab mixes per track, not per voice. Two voices on one staff only become separate parts ("Women 1", "Women 2") through hidden per-voice tracks, which a prototype with real files has to prove first. Until then, a staff with two voices mixes as one part.
- A MIDI file mixes by the tracks it was exported with. MuseScore's MIDI export merges both voices on a staff into one track.
- The player's controls are written against the shared interface. An engine-specific feature has to fit that interface or stay out.
