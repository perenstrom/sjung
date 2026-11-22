# PROTOTYPE (PER-464): alphaTab in the player

Throwaway. Variant T of the player prototype (PER-458) plays real notation
files with alphaTab 1.9.0 instead of the fake clock and score.

## Run

```bash
npm install
npm run dev
```

Open `/app/<group>/pieces/<id>/prototype-player?variant=T&file=<key>` with
`file` one of `julklockorna`, `staffan`, `staffan-tocoda`, `test-mxl`.

## The files

The choir files are attachments on the map PER-443 and are not committed
(public repo). Put them in `public/prototype-player/files/`:

| File | From |
|---|---|
| `julklockorna.xml` | `Julklockorna.xml` as attached |
| `test-score.mxl` | `Test Score.mxl` as attached |
| `staffan.mxl` | `Sankt Staffan … (Kjellberg).mscz`, exported with MuseScore 4.7.7: `mscore -f -o staffan.mxl <file>.mscz` (without `-f` MuseScore refuses it as corrupted, exit 40) |
| `staffan-tocoda.xml` | `staffan.mxl` unzipped, with bar 18's `<sound coda="codab"/>` changed to `<sound tocoda="codab"/>` |

alphaTab itself (`alphaTab*.min.mjs`, Bravura font, SONiVOX sf3) is copied
from `node_modules/@coderline/alphatab/dist` into `public/prototype-player/alphatab/`
and loaded as a native module, so Turbopack never bundles it.

## Switches (URL)

`split`, `hyph`, `order`, `short`, `scale`, `layout`, `sound`: see the top of
`AlphaTabPlayer.tsx`. The Motor panel shows timings, tracks and channels,
repeats/jumps in the model, and the live output level and pitch.
