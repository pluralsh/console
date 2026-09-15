# Precompile builder for the pluralsh/console repository-prebake example.
FROM debian:bookworm-slim

ARG MISE_VERSION=v2026.9.7

ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates \
      curl \
      git \
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
    && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://mise.run | MISE_VERSION="${MISE_VERSION#v}" MISE_INSTALL_PATH=/usr/local/bin/mise sh \
    && mise --version

ENV MISE_YES=1 \
    MISE_TRUSTED_CONFIG_PATHS=/src \
    LANG=C.UTF-8 \
    LC_ALL=C.UTF-8 \
    ELIXIR_ERL_OPTIONS="+fnu"

WORKDIR /src
