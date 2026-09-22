#!/usr/bin/env bash
# Populate Console's Go module and build caches without running tests.
set -euo pipefail

ROOT=/data/console
cd "$ROOT/go"
eval "$(mise activate bash --shims)"

export GOPATH="$ROOT/.gopath"
export GOBIN="$GOPATH/bin"
export GOCACHE="$ROOT/.cache/go-build"
export GOMODCACHE="$ROOT/.cache/pkg/mod"
export GOWORK="$ROOT/go/go.work"
export PATH="$GOBIN:$PATH"
mkdir -p "$GOBIN" "$GOCACHE" "$GOMODCACHE"

mods=()
while IFS= read -r dir; do
  mods+=("${dir}/...")
done < <(go list -f '{{.Dir}}' -m)
go test -run='^$' "${mods[@]}"
