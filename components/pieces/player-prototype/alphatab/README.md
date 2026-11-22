# PROTOTYPE: alphaTab behind the desktop player (PER-463)

Throwaway. The desktop variants D, E and F play real notation files with
alphaTab 1.9.0, with the fix-ups PER-464 settled on (`prepareFile.ts`,
`splitVoices.ts`, `fixJumps` in `useAlphaTabPlayer.ts`).

## Run

```bash
npm install
npm run dev
```

Open `/app/<group>/pieces/<id>/prototype-player?variant=D|E|F&file=<key>` with
`file` one of `audio`, `julklockorna`, `ris`, `staffan`, `test-mxl`. The amber
strip at the bottom switches variant and how the score is shown; `?` lists the
keyboard shortcuts.

## The files

The choir files are attachments on the map PER-443 and are not committed
(public repo). Put them in `public/prototype-player/files/`:

| File | From |
|---|---|
| `julklockorna.xml` | `Julklockorna.xml` as attached |
| `test-score.mxl` | `Test Score.mxl` as attached |
| `staffan.mxl` | `Sankt Staffan … (Kjellberg).mscz`, exported with MuseScore 4.7.7: `mscore -f -o staffan.mxl <file>.mscz` (without `-f` MuseScore refuses it as corrupted, exit 40) |

alphaTab itself (`alphaTab*.min.mjs`, Bravura font, SONiVOX sf3) is copied
from `node_modules/@coderline/alphatab/dist` into `public/prototype-player/alphatab/`
and loaded as a native module, so Turbopack never bundles it.
