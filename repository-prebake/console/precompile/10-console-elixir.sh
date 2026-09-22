#!/usr/bin/env bash
# Precompile Console's Elixir dependencies and test build.
set -euo pipefail

ROOT=/data/console
cd "$ROOT"
eval "$(mise activate bash --shims)"

# Keep Mix and Hex in the repository so they survive the runtime move.
export MIX_HOME="$ROOT/.mix"
export MIX_ARCHIVES="$MIX_HOME/archives"
export HEX_HOME="$ROOT/.hex"
mkdir -p "$MIX_HOME" "$MIX_ARCHIVES" "$HEX_HOME"

mix local.hex --force
mix local.rebar --force
mix deps.get
MIX_ENV=test mix compile
