# MuseScore converter worker

A stateless HTTP service that turns a MuseScore score (`.mscz`) into compressed MusicXML (`.mxl`) by running the official, unmodified MuseScore 4 command-line tool headless. It knows nothing about Sjung: the app sends it a score and stores what comes back. Why it is a separate container is in [ADR-0009](../../docs/adr/0009-musescore-files-are-converted-by-a-separate-worker.md); the measurements behind its limits are in the PER-476 spike in Linear.

## API

| Request         | Answer                                                                                                                                    |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /convert` | The score's bytes as the body. `200` with the `.mxl` bytes (`application/vnd.recordare.musicxml`).                                        |
|                 | `400` empty body, `413` body over `MAX_SCORE_BYTES`, `422` MuseScore couldn't convert it, `504` it took longer than `CONVERT_TIMEOUT_MS`. |
| `GET /health`   | `200 ok`. The image's `HEALTHCHECK` uses it.                                                                                              |

Error answers are plain text; a `422` or `504` includes what MuseScore printed. The worker runs one conversion at a time and queues the rest, since one MuseScore process needs up to about 260 MB. A typical choir score takes about 0.3–1 s; the largest tested, a complete mass, about 2.5 s.

```bash
curl --data-binary @score.mscz -o score.mxl http://localhost:8080/convert
```

## Configuration

| Variable             | Default                 | Meaning                                         |
| -------------------- | ----------------------- | ----------------------------------------------- |
| `PORT`               | `8080`                  | Port the server listens on                      |
| `CONVERT_TIMEOUT_MS` | `30000`                 | Time limit per conversion; MuseScore is killed  |
| `MAX_SCORE_BYTES`    | `20971520` (20 MB)      | Largest score accepted                          |
| `MUSESCORE_COMMAND`  | `/opt/musescore/AppRun` | The MuseScore CLI; the tests point it at a fake |

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

1. Add a resource from this repository with the **Dockerfile** build pack, base directory `/workers/musescore-converter` and branch `main`.
2. Give it **no domain** and no published ports, so it can't be reached from the internet. The app reaches it over Coolify's Docker network at `http://<container name>:8080`.
3. Set a memory limit of **512 MB** (Resource Limits). The host has swapped before, and one conversion needs about 260 MB.
4. Deploy, then check from the app host that a real score converts, for example `docker exec <sjung app container> curl -s -o /dev/null -w '%{http_code}' --data-binary @score.mscz http://<container name>:8080/convert` after copying a score into the container.
5. Give the app the worker's URL as config, so it can call it. The app side is PER-478.

Building on the host needs about 1–2 GB of build cache on top of the image, because the build downloads and unpacks a 190 MB AppImage. Redeploy it by hand when this folder changes; it is not part of the app's CI deploys.

## Licence

MuseScore is GPL. It runs as a separate, unmodified program that only exchanges files with Sjung, so its licence puts no obligations on Sjung's code (ADR-0009).
