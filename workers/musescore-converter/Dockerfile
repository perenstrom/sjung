# The MuseScore converter worker: the unmodified MuseScore 4 CLI behind a small
# HTTP server. See README.md and ADR-0009.

# Unpacks the AppImage without running it, so the image cross-builds for
# another architecture (the x86_64 AppImage can't extract itself under emulation).
FROM --platform=$BUILDPLATFORM debian:trixie-slim AS unpack
ARG TARGETARCH
ARG MUSESCORE_VERSION=4.7.7
ARG MUSESCORE_BUILD=261109195
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl squashfs-tools
# Drops the bundled updater (132 MB), which conversion doesn't use.
RUN case "$TARGETARCH" in arm64) A=aarch64;; amd64) A=x86_64;; *) exit 1;; esac \
 && curl -fsSL -o /musescore.AppImage \
      "https://github.com/musescore/MuseScore/releases/download/v${MUSESCORE_VERSION}/MuseScore-Studio-${MUSESCORE_VERSION}.${MUSESCORE_BUILD}-${A}.AppImage" \
 && for offset in $(grep -abo hsqs /musescore.AppImage | cut -d: -f1); do \
      unsquashfs -q -o "$offset" -d /musescore /musescore.AppImage >/dev/null 2>&1 && break; rm -rf /musescore; done \
 && test -x /musescore/AppRun \
 && rm -rf /musescore/appimageupdatetool.AppDir

# The bundled Qt 6 needs glibc >= 2.38, so it has to be trixie, not bookworm.
FROM node:24-trixie-slim
# libcom-err2 and libgpg-error0 aren't pulled in by the others, and the x86_64
# binary won't load without them. tini reaps MuseScore processes and forwards SIGTERM.
RUN apt-get update && apt-get install -y --no-install-recommends \
      libglib2.0-0 libfontconfig1 libfreetype6 libgl1 libegl1 libopengl0 libxkbcommon0 \
      libdbus-1-3 libasound2t64 libnss3 libxcb1 libx11-6 libx11-xcb1 libxrender1 libxi6 \
      libpulse0 libjack-jackd2-0 libcom-err2 libgpg-error0 tini \
 && rm -rf /var/lib/apt/lists/*
COPY --from=unpack /musescore /opt/musescore
COPY server.ts /app/server.ts

# On Linux MuseScore forces QT_QPA_PLATFORM=xcb unless MU_QT_QPA_PLATFORM is set,
# and it doesn't copy one into the other, so both are needed to run without X.
ENV LANG=C.UTF-8 QT_QPA_PLATFORM=offscreen MU_QT_QPA_PLATFORM=offscreen \
    NODE_ENV=production PORT=8080
USER node
WORKDIR /home/node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s \
  CMD node -e "fetch('http://127.0.0.1:' + process.env.PORT + '/health').then(r => process.exit(r.ok ? 0 : 1), () => process.exit(1))"
ENTRYPOINT ["tini", "--"]
CMD ["node", "/app/server.ts"]
