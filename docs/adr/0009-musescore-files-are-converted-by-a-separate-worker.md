# MuseScore files are converted by a separate worker running MuseScore itself

Status: accepted

Sjung plays MuseScore (`.mscz`) Files in its player (PER-443). The browser can't read them, so each one is converted once after upload into compressed MusicXML (`.mxl`), which the player draws and plays like any uploaded MusicXML. The converter is the official MuseScore 4 command-line tool, run unmodified in its own container next to the app as a stateless HTTP service: it is given a score and returns MusicXML. It knows nothing about Sjung. The app calls it after an upload is finalized, stores the result next to the File and records the conversion's state (pending, ready or failed) on the File row. We accept a large container (roughly 0.5–1.5 GB) and a pending state because MuseScore itself is the only reader that opens every file version from 1.x to 4.x faithfully. Because it runs as a separate program that only exchanges files with Sjung, its GPL licence puts no obligations on Sjung's code.

## Considered options

- **Unzip the `.mscz` and read its `.mscx` in the browser with our own reader** (as Notrummet does). Rejected: fidelity would be limited to what the reader covers, and MuseScore's format 5.00 moves every spanner into a score-level map, which would break such a reader. The only complete readers (MuseScore, MuseEncore, ms3) are GPL, and porting their code into the client would make the client GPL.
- **webmscore (MuseScore compiled to WASM) in the browser.** Rejected: it is based on MuseScore 3, has not had a release since January 2023, produces blank output for MuseScore 4 files, adds about 17.5 MB to the client, and shipping GPL code to the browser conveys it.
- **Not accepting `.mscz`; people export MusicXML from MuseScore themselves.** Rejected: choirs keep their rehearsal scores as `.mscz`, and asking every uploader to export first was too much of a barrier.
- **A queue (a database table polled by the worker, or pg-boss) instead of an HTTP call.** Rejected for now: the worker would need database access and the schema, and with few uploads a manual retry is enough. Revisit if conversions are lost in practice.

## Consequences

- The uploaded `.mscz` stays the File and can still be downloaded. The MusicXML is a derived copy with no name or Category of its own, and it follows its File on replace and delete as ADR-0005 describes.
- A `.mscz` can't be played until its conversion finishes. A failed conversion leaves an ordinary downloadable File, and someone with Manage content can retry it.
- The source is always kept, so we can produce other forms (MIDI, for example) later by converting again.
- Conversion time, memory per score and the image size are not measured yet. A spike measures them before the `.mscz` slice is built.
