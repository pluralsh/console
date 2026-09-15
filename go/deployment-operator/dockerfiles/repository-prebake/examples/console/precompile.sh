#!/usr/bin/env bash
# Precompile pluralsh/console so agent runs are not compile-from-zero.
# Runs inside the example compile image with the repository mounted at /src.
set -euo pipefail

cd /src

export MISE_YES=1
export LANG="${LANG:-C.UTF-8}"
export LC_ALL="${LC_ALL:-C.UTF-8}"
export ELIXIR_ERL_OPTIONS="${ELIXIR_ERL_OPTIONS:-+fnu}"

git config --global --add safe.directory /src

mise trust --all || true
mise install
# .tool-versions has erlang/elixir/rust only. Install node/go and select them so
# shims like corepack resolve (otherwise: "No version is set for shim: corepack").
mise use -g go@1.27.1 node@24.11.1
eval "$(mise activate bash --shims)"

mix local.hex --force
mix local.rebar --force
mix deps.get
MIX_ENV=test mix compile

(
  cd js
  corepack enable
  yarn install --immutable
)

export GOPATH=/src/.gopath
export GOBIN=/src/.gopath/bin
export GOCACHE=/src/.cache/go-build
export GOMODCACHE=/src/.cache/pkg/mod
mkdir -p "$GOBIN" "$GOCACHE" "$GOMODCACHE"
export PATH="$GOBIN:$PATH"

(
  cd /src/go
  go test -run='^$' ./...
)
