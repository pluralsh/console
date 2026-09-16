#!/usr/bin/env bash
# Precompile this repository so agent runs are not compile-from-zero.
# Runs in the console prebake image with PRECOMPILE_ROOT (default /data/console).
set -euo pipefail

ROOT="${PRECOMPILE_ROOT:-/data/console}"
cd "$ROOT"

export MISE_YES=1
export LANG="${LANG:-C.UTF-8}"
export LC_ALL="${LC_ALL:-C.UTF-8}"
export ELIXIR_ERL_OPTIONS="${ELIXIR_ERL_OPTIONS:-+fnu}"

git config --global --add safe.directory "$ROOT"

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

# Yarn 4 is vendored; mise shims do not expose a `yarn` binary.
(
  cd js
  node .yarn/releases/yarn-4.17.1.cjs install --immutable
)

export GOPATH="$ROOT/.gopath"
export GOBIN="$ROOT/.gopath/bin"
export GOCACHE="$ROOT/.cache/go-build"
export GOMODCACHE="$ROOT/.cache/pkg/mod"
export GOWORK="$ROOT/go/go.work"
mkdir -p "$GOBIN" "$GOCACHE" "$GOMODCACHE"
export PATH="$GOBIN:$PATH"

cd "$ROOT/go"
mods=()
while IFS= read -r dir; do
  mods+=("${dir}/...")
done < <(go list -f '{{.Dir}}' -m)
go test -run='^$' "${mods[@]}"
