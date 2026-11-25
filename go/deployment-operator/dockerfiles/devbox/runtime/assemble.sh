#!/bin/sh
# Builds the agent components of ghcr.io/pluralsh/devbox-runtime-core: one directory per component under <out>,
# holding only what that component runs from. Run by runtime-core.Dockerfile in the build platform's Node image;
# npm installs the target platform's packages, so no emulation is needed.
#
#   assemble.sh <spec> <out dir> <versions file> <amd64|arm64> <component>=<version>...
#
# Each component is the npm package components.json names for it, at the version given (the Dockerfile's ARGs),
# installed on its own and without install scripts. ESBUILD_VERSION is the bundler's. The versions file gets
# "<component> <version>" lines, for the manifest.
#
# There is no lockfile. Every package is installed with npm's --before set to a day after its version was
# published, so its dependencies resolve to versions that existed then, not to whatever is newest in range when the
# image is built. The day is for the packages published with it: claude's platform binaries come out up to an hour
# after the package that depends on them. A version younger than that is refused, since nothing would pin its
# dependencies yet (Renovate waits two days). npm still prefers versions that aren't deprecated and the current
# "latest" tag, so a dependency deprecated or retagged later can change a component on a rebuild: its hash in the
# manifest changes, and instances copy it again.
#
# The native agents (claude, codex, opencode) keep only their binary, the ACP adapters are bundled into one file
# each, and the tools that can't be bundled keep their pruned node_modules. Nothing may be a symlink: the
# installer copies regular files only.
set -eu

spec=$1
out=$2
versions=$3
case "$4" in
  amd64) cpu=x64 triple=x86_64-unknown-linux-musl ;;
  arm64) cpu=arm64 triple=aarch64-unknown-linux-musl ;;
  *) echo "unsupported architecture $4" >&2; exit 1 ;;
esac
shift 4
pins="$*"

case "$(uname -m)" in
  x86_64) host_cpu=x64 ;;
  aarch64) host_cpu=arm64 ;;
  *) echo "unsupported build architecture $(uname -m)" >&2; exit 1 ;;
esac

# A fixed path: esbuild writes the paths of the modules it bundles into the bundle, and the components must be
# the same on every build.
work=/tmp/devbox-runtime-assemble
rm -rf "$work"
mkdir -p "$work"
trap 'rm -rf "$work"' EXIT

# pinned <component>: the version given for it.
pinned() {
  for arg in $pins; do
    if [ "${arg%%=*}" = "$1" ]; then echo "${arg#*=}"; return; fi
  done
  echo "no version given for $1" >&2
  exit 1
}

# package <component>: its npm package, from the spec.
package() {
  node -e 'const c = JSON.parse(require("node:fs").readFileSync(process.argv[1], "utf8")).components[process.argv[2]]
    if (!c || !c.package) { console.error(`${process.argv[2]} has no npm package in the spec`); process.exit(1) }
    console.log(c.package)' "$spec" "$1"
}

# npm_get <dir> <package> <version> [cpu]: installs the package into $work/<dir>, for the target CPU unless
# another is given, as of a day after that version was published.
npm_get() {
  before=$(npm view "$2@$3" time --json | node -e 'let s = ""
    process.stdin.on("data", d => s += d).on("end", () => {
      const t = JSON.parse(s)[process.argv[1]]
      if (!t) { console.error(`no publish time for ${process.argv[1]}`); process.exit(1) }
      const before = Date.parse(t) + 24 * 3600 * 1000
      if (before > Date.now()) { console.error(`${process.argv[1]} is less than a day old, so its dependencies are not pinned yet`); process.exit(1) }
      console.log(new Date(before).toISOString())
    })' "$3")
  mkdir -p "$work/$1"
  npm install --prefix "$work/$1" --omit=dev --ignore-scripts --no-audit --no-fund \
    --os=linux --cpu="${4:-$cpu}" --libc=glibc --before="$before" "$2@$3" >/dev/null
}

# component <component>: installs the component's package at its pinned version.
component() {
  v=$(pinned "$1")
  p=$(package "$1")
  npm_get "$1" "$p" "$v"
  printf '%s %s\n' "$1" "$v" >> "$versions"
}

# prune <dir>: drops what no tool reads at runtime, and native addon prebuilds for other platforms.
prune() {
  find "$1" -type d -name .bin -path '*/node_modules/.bin' -prune -exec rm -rf {} +
  rm -f "$1/node_modules/.package-lock.json"
  find "$1" -type d -path '*/prebuilds/*' ! -path '*/prebuilds/*/*' ! -name "linux-$cpu" -prune -exec rm -rf {} +
  find "$1" -type f \( -name '*.map' -o -name '*.d.ts' -o -name '*.d.mts' -o -name '*.d.cts' \) -delete
  rm -f "$1/package.json" "$1/package-lock.json"
}

# bundle <component> <entry>: bundles an ESM CLI and its dependencies into <out>/<component>/index.mjs.
bundle() {
  component "$1"
  mkdir -p "$out/$1"
  # From the component's directory, so the paths esbuild records are relative to it.
  (cd "$work/$1" && "$work/esbuild/node_modules/.bin/esbuild" "node_modules/$2" --bundle --platform=node --format=esm \
    --target=node24 --legal-comments=none --log-level=warning --outfile="$out/$1/index.mjs" \
    --banner:js="import { createRequire as __devboxRequire } from 'node:module'; const require = __devboxRequire(import.meta.url);")
}

# tree <component>: keeps the pruned install.
tree() {
  component "$1"
  prune "$work/$1"
  mv "$work/$1" "$out/$1"
}

mkdir -p "$out"
: > "$versions"
# esbuild runs here, on the build platform, and isn't shipped.
npm_get esbuild esbuild "${ESBUILD_VERSION:?ESBUILD_VERSION is not set}" "$host_cpu"

component claude
install -D -m 0755 "$work/claude/node_modules/@anthropic-ai/claude-code-linux-$cpu/claude" "$out/claude/bin/claude"

component codex
mkdir -p "$out/codex"
cp -R "$work/codex/node_modules/@openai/codex-linux-$cpu/vendor/$triple/." "$out/codex/"

component opencode
install -D -m 0755 "$work/opencode/node_modules/opencode-linux-$cpu/bin/opencode" "$out/opencode/bin/opencode"

bundle claude-acp @agentclientprotocol/claude-agent-acp/dist/index.js
bundle codex-acp @agentclientprotocol/codex-acp/dist/index.js
bundle pi-acp pi-acp/dist/index.js

tree gemini
tree pi
tree pi-mcp-adapter
tree playwright-mcp

links=$(find "$out" -type l)
if [ -n "$links" ]; then
  echo "components must not contain symlinks:" >&2
  echo "$links" >&2
  exit 1
fi
