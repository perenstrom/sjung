# MuseScore converter worker

A stateless HTTP service that turns a MuseScore score (`.mscz`) into compressed MusicXML (`.mxl`) by running the official, unmodified MuseScore 4 command-line tool headless. It knows nothing about Sjung: the app sends it a score and stores what comes back. Why it is a separate container is in [ADR-0009](../../docs/adr/0009-musescore-files-are-converted-by-a-separate-worker.md); the measurements behind its limits are in the PER-476 spike in Linear.

## API

| Request         | Answer                                                                                                                                                                                |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /convert` | The score's bytes as the body. `200` with the `.mxl` bytes (`application/vnd.recordare.musicxml`).                                                                                    |
|                 | `400` empty body, `413` body over `MAX_SCORE_BYTES`, `422` MuseScore couldn't convert it, `503` `MAX_WAITING` scores already waiting, `504` it took longer than `CONVERT_TIMEOUT_MS`. |
| `GET /health`   | `200 ok`. The image's `HEALTHCHECK` uses it.                                                                                                                                          |

Error answers are plain text; a `422` or `504` includes what MuseScore printed. The worker runs one conversion at a time, since one MuseScore process needs up to about 260 MB, and queues up to `MAX_WAITING` more. In the spike a typical choir score took about 0.3 s on arm64 and the largest tested, a complete mass, 1.7 s; through this worker on a Mac they took about 0.4–1 s and 2.6 s.

```bash
curl --data-binary @score.mscz -o score.mxl http://localhost:8080/convert
```

## Configuration

| Variable             | Default                 | Meaning                                          |
| -------------------- | ----------------------- | ------------------------------------------------ |
| `PORT`               | `8080`                  | Port the server listens on                       |
| `CONVERT_TIMEOUT_MS` | `30000`                 | Time limit per conversion; MuseScore is killed   |
| `MAX_SCORE_BYTES`    | `20971520` (20 MB)      | Largest score accepted                           |
| `MAX_WAITING`        | `4`                     | Conversions that may wait behind the running one |
| `MUSESCORE_COMMAND`  | `/opt/musescore/AppRun` | The MuseScore CLI; the tests point it at a fake  |

The MuseScore version is pinned by the build arguments `MUSESCORE_VERSION` and `MUSESCORE_BUILD` in the `Dockerfile`; both come from the AppImage's file name on [MuseScore's releases page](https://github.com/musescore/MuseScore/releases). MuseScore always runs with `-f`, or it refuses some real files as corrupted.

## Running it locally

```bash
docker build -t sjung-musescore-converter workers/musescore-converter
```

```bash
docker run --rm --memory 512m -p 8080:8080 sjung-musescore-converter
```

The image builds for the machine's architecture, or for another with `--platform linux/amd64` or `linux/arm64`. It is about 340 MB to pull and about 920 MB unpacked.

The server is `server.ts`, run by Node's built-in TypeScript support, so it has no build step and no dependencies. Its tests run with the app's unit tests (`npm run test:unit`) against `fake-musescore.mjs` instead of the real CLI.

## Deploying on Coolify

The worker is one Coolify app shared by `sjung-staging` and `sjung-production`, on the same server.

1. Add an Application from this repository, through the same GitHub App source as the Sjung apps, on the default `coolify` destination. Use branch `main`, build pack **Dockerfile**, Base Directory `/workers/musescore-converter` and Dockerfile Location `/Dockerfile`.
2. Keep it off the internet: delete any domain Coolify generated on the Domains page, leave Port Mappings empty, and set Ports Exposes to `8080` (internal only).
3. Give it a stable hostname: under General > Network, set Network Aliases to `musescore-converter`. Coolify's generated container names change with each deploy; the alias doesn't. The app then reaches the worker at `http://musescore-converter:8080`.
4. Under Resource Limits, set Memory limit and Memory and swap limit both to `512m`, so it can't swap. One conversion needs about 260 MB, and the host has swapped before.
5. Under Advanced > Deployment, set Auto deploy to Manual deployments only, so pushes to `main` don't rebuild it.
6. Deploy. Then, on the server, check that a real score converts over the Docker network; this should print `200`:

   ```bash
   docker run --rm --network coolify -v "$PWD/score.mscz:/score.mscz:ro" curlimages/curl -s -o /dev/null -w '%{http_code}\n' --data-binary @/score.mscz http://musescore-converter:8080/convert
   ```

7. Set the runtime variable `MUSESCORE_CONVERTER_URL` to `http://musescore-converter:8080` on both `sjung-staging` and `sjung-production`. The app starts calling it in PER-478.

Building on the host needs about 1–2 GB of build cache on top of the image, because the build downloads and unpacks a 190 MB AppImage. Redeploy it by hand when this folder changes; it is not part of the app's CI deploys. On stop it finishes the running and waiting conversions first (at most about 2.5 minutes with the defaults), so a shorter stop grace period cuts them off; the app retries a failed conversion (ADR-0009).

## Licence

MuseScore is GPL. It runs as a separate, unmodified program that only exchanges files with Sjung, so its licence puts no obligations on Sjung's code (ADR-0009).
