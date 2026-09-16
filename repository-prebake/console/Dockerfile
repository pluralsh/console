# syntax=docker/dockerfile:1
#
# Console prebake image: extend the published repository-prebake base, COPY
# this checkout, RUN prebake, then precompile.sh.
#
#   docker build -f repository-prebake/console/Dockerfile \
#     --build-arg PREBAKE_IMAGE=ghcr.io/pluralsh/repository-prebake:local \
#     -t ghcr.io/pluralsh/console-repos:local .

ARG PREBAKE_IMAGE=ghcr.io/pluralsh/repository-prebake:latest
ARG MISE_VERSION=v2026.9.7

FROM ${PREBAKE_IMAGE}
ARG MISE_VERSION

RUN apt-get update && apt-get install -y --no-install-recommends \
      curl \
      bash \
      build-essential \
      autoconf \
      m4 \
      libssl-dev \
      libncurses5-dev \
      unixodbc-dev \
      unzip \
      python3 \
      pkg-config \
    && rm -rf /var/lib/apt/lists/* \
    && curl -fsSL https://mise.run | MISE_VERSION="${MISE_VERSION#v}" MISE_INSTALL_PATH=/usr/local/bin/mise sh \
    && mise --version

ENV MISE_YES=1 \
    MISE_TRUSTED_CONFIG_PATHS=/data/console \
    LANG=C.UTF-8 \
    LC_ALL=C.UTF-8 \
    ELIXIR_ERL_OPTIONS="+fnu" \
    PRECOMPILE_ROOT=/data/console

COPY repository-prebake/console/repos.yaml /config/repos.yaml
COPY repository-prebake/console/precompile.sh /usr/local/bin/precompile.sh
COPY . /data/console
RUN chmod +x /usr/local/bin/precompile.sh \
 && git config --global --add safe.directory /data/console \
 && prebake --config /config/repos.yaml \
 && precompile.sh \
 && chown -R 65532:65532 /data

USER 65532
