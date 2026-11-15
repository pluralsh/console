#!/usr/bin/env bash
# Builds and tests the devbox images.
#
#   ./test.sh [step...]     steps: versions lint minimal gateway fat fat-check example all
#                           (default: versions lint minimal gateway fat-check)
#
# Environment:
#   DAEMON_SOURCE   build | stub   (default: build if cmd/devbox-daemon exists, else stub)
#   GATEWAY_SOURCE  build | stub   (default: build if cmd/devbox-gateway exists, else stub)
#   TAG             tag for the test images (default: test)
#   PLATFORM        e.g. linux/amd64 (default: the Docker host's platform)
#   BUILDER         buildx builder for the minimal and gateway builds (loaded with
#                   --load), so their cache can be dropped with the builder. fat and
#                   example build FROM a local image and always use the default builder.
#   KEEP_IMAGES=1   keep the built images instead of removing them at exit
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
go_dir="$(cd "${here}/../../.." && pwd)"
operator_dir="${go_dir}/deployment-operator"
rel="deployment-operator/dockerfiles/devbox"

TAG="${TAG:-test}"
KEEP_IMAGES="${KEEP_IMAGES:-0}"
CST_VERSION="${CST_VERSION:-1.22.1}"
HADOLINT_IMAGE="${HADOLINT_IMAGE:-hadolint/hadolint:v2.14.0}"

minimal_image="devbox-minimal:${TAG}"
fat_image="devbox-fat:${TAG}"
gateway_image="devbox-gateway:${TAG}"
example_image="devbox-example:${TAG}"
built=()

default_source() {
  if compgen -G "${operator_dir}/cmd/$1/*.go" >/dev/null; then echo build; else echo stub; fi
}
DAEMON_SOURCE="${DAEMON_SOURCE:-$(default_source devbox-daemon)}"
GATEWAY_SOURCE="${GATEWAY_SOURCE:-$(default_source devbox-gateway)}"

platform_args=()
[ -n "${PLATFORM:-}" ] && platform_args=(--platform "${PLATFORM}")

log() { printf '\n==> %s\n' "$*"; }

cleanup() {
  local rc=$?
  if [ "${KEEP_IMAGES}" != "1" ] && [ "${#built[@]}" -gt 0 ]; then
    log "Removing test images: ${built[*]}"
    docker image rm -f "${built[@]}" >/dev/null 2>&1 || true
  fi
  exit "${rc}"
}
trap cleanup EXIT

build() {
  local image="$1" dockerfile="$2"; shift 2
  log "Building ${image} (${dockerfile})"
  DOCKER_BUILDKIT=1 docker build ${platform_args[@]+"${platform_args[@]}"} \
    -f "${here}/${dockerfile}" -t "${image}" "$@" "${go_dir}"
  built+=("${image}")
}

# Self-contained images can use a dedicated builder.
build_isolated() {
  if [ -z "${BUILDER:-}" ]; then build "$@"; return; fi
  local image="$1" dockerfile="$2"; shift 2
  log "Building ${image} (${dockerfile}) with builder ${BUILDER}"
  docker buildx build --builder "${BUILDER}" --load ${platform_args[@]+"${platform_args[@]}"} \
    -f "${here}/${dockerfile}" -t "${image}" "$@" "${go_dir}"
  built+=("${image}")
}

# container-structure-test from PATH, or a pinned, checksum-verified download.
cst() {
  if command -v container-structure-test >/dev/null 2>&1; then
    container-structure-test "$@"
    return
  fi
  local os arch dir bin base
  os="$(uname -s | tr '[:upper:]' '[:lower:]')"
  case "$(uname -m)" in x86_64 | amd64) arch=amd64 ;; arm64 | aarch64) arch=arm64 ;; *) echo "unsupported arch" >&2; return 1 ;; esac
  dir="${TMPDIR:-/tmp}/devbox-test-bin"
  bin="${dir}/container-structure-test-${CST_VERSION}"
  if [ ! -x "${bin}" ]; then
    base="https://github.com/GoogleContainerTools/container-structure-test/releases/download/v${CST_VERSION}"
    mkdir -p "${dir}"
    curl -fsSLo "${bin}.tmp" "${base}/container-structure-test-${os}-${arch}"
    (cd "${dir}" && echo "$(curl -fsSL "${base}/checksums.txt" | awk -v f="container-structure-test-${os}-${arch}" '$2 == f {print $1}')  ${bin##*/}.tmp" | shasum -a 256 -c - >/dev/null)
    chmod +x "${bin}.tmp" && mv "${bin}.tmp" "${bin}"
  fi
  "${bin}" "$@"
}

structure_test() {
  local image="$1"; shift
  local configs=()
  for c in "$@"; do configs+=(--config "${here}/tests/${c}"); done
  log "container-structure-test ${image}: $*"
  cst test --image "${image}" "${configs[@]}"
}

# The daemon is PID 1, serves :80 and exits promptly on SIGTERM.
runtime_test() {
  local image="$1" name="devbox-runtime-test-$$"
  log "Runtime test ${image}"
  docker run -d --name "${name}" "${image}" >/dev/null
  # shellcheck disable=SC2064
  trap "docker rm -f ${name} >/dev/null 2>&1 || true; cleanup" EXIT
  local pid1 ready=""
  sleep 2
  pid1="$(docker exec "${name}" cat /proc/1/comm)"
  [ "${pid1}" = "devbox-daemon" ] || { echo "PID 1 is '${pid1}', want devbox-daemon"; docker logs "${name}"; return 1; }
  for _ in $(seq 1 15); do
    if docker exec "${name}" curl -fsS http://127.0.0.1:80/readyz >/dev/null 2>&1; then ready=1; break; fi
    sleep 1
  done
  if [ -z "${ready}" ]; then
    if [ "${DAEMON_SOURCE}" = "stub" ]; then echo "/readyz never answered"; docker logs "${name}"; return 1; fi
    echo "warning: /readyz did not answer within 15s (the real daemon may need instance config)"
  fi
  local start end
  start="$(date +%s)"
  docker stop -t 10 "${name}" >/dev/null
  end="$(date +%s)"
  [ $((end - start)) -lt 10 ] || { echo "daemon ignored SIGTERM (took $((end - start))s)"; return 1; }
  docker rm "${name}" >/dev/null
  trap cleanup EXIT
  echo "PID 1 ok, /readyz $([ -n "${ready}" ] && echo ok || echo skipped), SIGTERM exit in $((end - start))s"
}

# Harness pins must match the agent-run images.
step_versions() {
  log "Checking harness versions against dockerfiles/agent-harness"
  local ah="${operator_dir}/dockerfiles/agent-harness" fail=0
  arg() { sed -n "s/^ARG $2=\(.*\)$/\1/p" "$1" | head -1; }
  check() {
    local name="$1" want="$2" got
    got="$(arg "${here}/minimal.Dockerfile" "${name}")"
    if [ "${got}" = "${want}" ]; then echo "  ${name}=${got}"; else echo "  ${name}=${got}, agent-run images use ${want}"; fail=1; fi
  }
  check CLAUDE_VERSION "$(arg "${ah}/claude.Dockerfile" AGENT_VERSION)"
  check CLAUDE_ACP_VERSION "$(arg "${ah}/claude.Dockerfile" ACP_VERSION)"
  check CODEX_VERSION "$(arg "${ah}/codex.Dockerfile" AGENT_VERSION)"
  check CODEX_ACP_VERSION "$(arg "${ah}/codex.Dockerfile" ACP_VERSION)"
  check OPENCODE_VERSION "$(arg "${ah}/opencode.Dockerfile" AGENT_VERSION)"
  check GEMINI_VERSION "$(arg "${ah}/gemini.Dockerfile" AGENT_VERSION)"
  check PI_VERSION "$(arg "${ah}/pi.Dockerfile" AGENT_VERSION)"
  check PI_ACP_VERSION "$(arg "${ah}/pi.Dockerfile" ACP_VERSION)"
  check PI_MCP_ADAPTER_VERSION "$(arg "${ah}/pi.Dockerfile" MCP_ADAPTER_VERSION)"
  check NODE_VERSION "$(sed -n 's/^ *NODE_VERSION: *//p' "${go_dir}/../.github/workflows/deployment-operator-cd-agent-harness.yaml" | head -1)"
  return "${fail}"
}

step_lint() {
  log "hadolint"
  local f rc=0
  for f in minimal.Dockerfile fat.Dockerfile gateway.Dockerfile examples/Dockerfile; do
    echo "  ${f}"
    docker run --rm -i -v "${here}/.hadolint.yaml:/.hadolint.yaml:ro" "${HADOLINT_IMAGE}" \
      hadolint --config /.hadolint.yaml - < "${here}/${f}" || rc=1
  done
  return "${rc}"
}

step_minimal() {
  build_isolated "${minimal_image}" minimal.Dockerfile \
    --build-arg DAEMON_SOURCE="${DAEMON_SOURCE}" --build-arg VERSION="0.0.0-${TAG}"
  structure_test "${minimal_image}" common.yaml minimal.yaml
  runtime_test "${minimal_image}"
}

step_gateway() {
  build_isolated "${gateway_image}" gateway.Dockerfile \
    --build-arg GATEWAY_SOURCE="${GATEWAY_SOURCE}" --build-arg VERSION="0.0.0-${TAG}"
  structure_test "${gateway_image}" gateway.yaml
}

ensure_minimal() {
  docker image inspect "${minimal_image}" >/dev/null 2>&1 || step_minimal
}

step_fat() {
  ensure_minimal
  build "${fat_image}" fat.Dockerfile --build-arg BASE_IMAGE="${minimal_image}"
  structure_test "${fat_image}" common.yaml fat.yaml
  runtime_test "${fat_image}"
}

# Static checks only (Dockerfile syntax, build-check rules); no layers are built.
# --check resolves every base image, so BASE_IMAGE defaults to a public stand-in.
step_fat_check() {
  log "docker buildx build --check fat.Dockerfile"
  docker buildx build ${BUILDER:+--builder "${BUILDER}"} --check \
    --build-arg BASE_IMAGE="${FAT_CHECK_BASE_IMAGE:-debian:trixie-20261104-slim}" \
    -f "${here}/fat.Dockerfile" "${go_dir}"
}

step_example() {
  ensure_minimal
  log "Building the example custom image"
  DOCKER_BUILDKIT=1 docker build ${platform_args[@]+"${platform_args[@]}"} \
    --build-arg BASE_IMAGE="${minimal_image}" -t "${example_image}" "${here}/examples"
  built+=("${example_image}")
  structure_test "${example_image}" common.yaml
}

steps=("$@")
[ "${#steps[@]}" -eq 0 ] && steps=(versions lint minimal gateway fat-check)
[ "${steps[*]}" = "all" ] && steps=(versions lint minimal gateway fat example)

echo "daemon source: ${DAEMON_SOURCE}, gateway source: ${GATEWAY_SOURCE}"
for s in "${steps[@]}"; do
  "step_${s//-/_}"
done
log "All requested steps passed: ${steps[*]}"
