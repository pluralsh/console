#!/usr/bin/env bash
# Precompile Plural's Elixir dependencies and test build.
set -euo pipefail

ROOT=/data/plural
cd "$ROOT"
mise trust "$ROOT/.tool-versions"
mise install
eval "$(mise activate bash --shims)"

export MIX_HOME="$ROOT/.mix"
export MIX_ARCHIVES="$MIX_HOME/archives"
export HEX_HOME="$ROOT/.hex"
mkdir -p "$MIX_HOME" "$MIX_ARCHIVES" "$HEX_HOME"

mix local.hex --force
mix local.rebar --force
mix deps.get
MIX_ENV=test mix compile
