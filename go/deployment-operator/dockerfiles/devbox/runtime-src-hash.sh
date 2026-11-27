#!/usr/bin/env bash
# Prints the source hash of ghcr.io/pluralsh/devbox-runtime-core: a sha256 over everything that decides what the
# image contains. CD builds the image once per hash and tags later releases onto the same digest, so a release
# that doesn't change the daemon doesn't change the image, and no runner rolls a new revision for it.
#
#   ./runtime-src-hash.sh          the hash (64 hex characters)
#   ./runtime-src-hash.sh --files    the hashed files, relative to ./go
#   ./runtime-src-hash.sh --modules  the hashed module versions
#
# Hashed: the Go, assembly, object and embedded files of every package devbox-daemon, devbox-runtime-installer and
# devbox-runtime-manifest import from this repository (for linux/amd64 and linux/arm64), the version of every other
# module they link (not go.mod and go.sum, which change with dependencies the daemon doesn't use), the module's go
# directive, the Dockerfile (which pins the Go toolchain, the Node image and the agents' versions), its
# dockerignore, the bake file, this script, everything under runtime/ (the component spec and build script) and
# patches/ (applied to the agents). Too narrow a hash
# ships a stale daemon, so anything else that reaches the image must be added here.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
go_dir="$(cd "${here}/../../.." && pwd)"
operator_dir="${go_dir}/deployment-operator"
rel="deployment-operator/dockerfiles/devbox"

files() {
  local arch
  for arch in amd64 arm64; do
    (cd "${operator_dir}" && CGO_ENABLED=0 GOOS=linux GOARCH="${arch}" GOFLAGS=-mod=readonly GOWORK=off go list -deps \
      -f '{{if not .Standard}}{{$d := .Dir}}{{range .GoFiles}}{{$d}}/{{.}}{{"\n"}}{{end}}{{range .SFiles}}{{$d}}/{{.}}{{"\n"}}{{end}}{{range .SysoFiles}}{{$d}}/{{.}}{{"\n"}}{{end}}{{range .EmbedFiles}}{{$d}}/{{.}}{{"\n"}}{{end}}{{end}}' \
      ./cmd/devbox-daemon ./cmd/devbox-runtime-installer ./cmd/devbox-runtime-manifest)
  done | sed -n "s|^${go_dir}/||p"
  echo "${rel}/runtime-core.Dockerfile"
  echo "${rel}/runtime-core.Dockerfile.dockerignore"
  echo "${rel}/docker-bake.hcl"
  echo "${rel}/runtime-src-hash.sh"
  (cd "${go_dir}" && find "${rel}/runtime" "${rel}/patches" -type f)
}

# The modules linked into the binaries, as "path version" (with what replaces them, if anything). Modules of this
# repository have no version and are covered by their files.
modules() {
  local arch
  for arch in amd64 arm64; do
    (cd "${operator_dir}" && CGO_ENABLED=0 GOOS=linux GOARCH="${arch}" GOFLAGS=-mod=readonly GOWORK=off go list -deps \
      -f '{{with .Module}}{{.Path}} {{.Version}}{{with .Replace}} => {{.Path}} {{.Version}}{{end}}{{end}}' \
      ./cmd/devbox-daemon ./cmd/devbox-runtime-installer ./cmd/devbox-runtime-manifest)
  done | LC_ALL=C sort -u
  grep -E '^(go|toolchain) ' "${operator_dir}/go.mod"
}

list="$(files | LC_ALL=C sort -u)"
[ -n "${list}" ] || { echo "no source files found" >&2; exit 1; }
if [ "${1:-}" = "--files" ]; then
  echo "${list}"
  exit 0
fi
if [ "${1:-}" = "--modules" ]; then
  modules
  exit 0
fi
{
  (cd "${go_dir}" && echo "${list}" | while read -r f; do sha256sum "${f}"; done)
  modules
} | sha256sum | cut -d' ' -f1
