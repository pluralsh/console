# syntax=docker/dockerfile:1.10
#
# ghcr.io/pluralsh/devbox-voxl: a statically linked voxl (github.com/tembo/voxl), which streams the devbox
# browser's Xvfb display as H.264, for images to copy from (devbox-voxl.yaml publishes it for amd64 and
# arm64). voxl publishes no binaries. The image holds only /voxl, so it runs on any Linux distribution.
#
#   docker build -f deployment-operator/dockerfiles/devbox/voxl.Dockerfile deployment-operator/dockerfiles/devbox
#
# Built against musl with x264, Opus and libyuv linked in, and without PulseAudio: the box has no desktop
# audio. x264 is GPL-2.0, so the binary is distributed under the GPL.

ARG ALPINE_IMAGE=alpine:3.23
# renovate: datasource=crate depName=voxl-server
ARG VOXL_VERSION=0.4.0
ARG OPUS_VERSION=1.5.2
ARG OPUS_SHA256=65c1d2f78b9f2fb20082c38cbe47c951ad5839345876e46941612ee87f9a7ce1
# x264 has no releases; this is the stable branch's head (0.164.3108), fetched by commit so git verifies it.
ARG X264_COMMIT=31e19f92f00c7003fa115047ce50978bc98c3a0d

FROM ${ALPINE_IMAGE} AS build

ARG VOXL_VERSION
ARG OPUS_VERSION
ARG OPUS_SHA256
ARG X264_COMMIT

SHELL ["/bin/ash", "-eo", "pipefail", "-c"]

# Alpine's Rust links build scripts dynamically, so bindgen can load libclang; only voxl itself is static.
# hadolint ignore=DL3018
RUN apk add --no-cache build-base bash pkgconf curl git nasm perl clang21-dev rust cargo esbuild \
      libyuv-dev libyuv-static

# Alpine ships x264 and Opus without static archives, so they're built here.
RUN set -eux; \
    git init --quiet /src/x264; cd /src/x264; \
    git fetch --quiet --depth 1 https://code.videolan.org/videolan/x264.git "${X264_COMMIT}"; \
    git checkout --quiet FETCH_HEAD; \
    ./configure --prefix=/usr/local --enable-static --disable-shared --disable-cli --enable-pic; \
    make -j"$(nproc)" install; \
    cd /src; \
    curl -fsSLo opus.tar.gz "https://downloads.xiph.org/releases/opus/opus-${OPUS_VERSION}.tar.gz"; \
    echo "${OPUS_SHA256}  opus.tar.gz" | sha256sum -c -; \
    tar -xzf opus.tar.gz; cd "opus-${OPUS_VERSION}"; \
    ./configure --prefix=/usr/local --enable-static --disable-shared --disable-doc --disable-extra-programs --with-pic; \
    make -j"$(nproc)" install; \
    rm -rf /src

# --target keeps RUSTFLAGS (crt-static) off the build scripts. libyuv is C++, so its runtime is linked in too.
RUN --mount=type=cache,target=/root/.cargo/registry,id=voxl-static-registry \
    --mount=type=cache,target=/build,id=voxl-static-target \
    set -eux; \
    target="$(rustc -vV | sed -n 's/^host: //p')"; \
    PKG_CONFIG_PATH=/usr/local/lib/pkgconfig PKG_CONFIG_ALL_STATIC=1 \
    RUSTFLAGS="-C target-feature=+crt-static -C link-arg=-static -C link-arg=-lstdc++" \
    CARGO_TARGET_DIR=/build \
      cargo install --locked --no-default-features --target "${target}" --root /out "voxl-server@${VOXL_VERSION}"; \
    strip /out/bin/voxl; \
    if ldd /out/bin/voxl 2>&1 | grep -q '=>'; then echo "voxl isn't static" >&2; ldd /out/bin/voxl; exit 1; fi; \
    /out/bin/voxl --version

FROM scratch

COPY --from=build /out/bin/voxl /voxl

ENTRYPOINT ["/voxl"]
