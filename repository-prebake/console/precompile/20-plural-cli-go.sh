#!/usr/bin/env bash
# Populate plural-cli's Go module and build caches without running tests.
set -euo pipefail

ROOT=/data/plural-cli
cd "$ROOT"
eval "$(mise activate bash --shims)"

export GOPATH="$ROOT/.gopath"
export GOBIN="$GOPATH/bin"
export GOCACHE="$ROOT/.cache/go-build"
export GOMODCACHE="$ROOT/.cache/pkg/mod"
export GOWORK=off
export PATH="$GOBIN:$PATH"
mkdir -p "$GOBIN" "$GOCACHE" "$GOMODCACHE"

go test -run='^$' ./...
