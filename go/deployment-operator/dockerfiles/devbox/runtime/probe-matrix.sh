#!/usr/bin/env bash
# Installs a devbox-runtime-core image's agents into a home volume the way the plural-runtime sidecar does, then
# runs `devbox-daemon probe` (ACP initialize and session/new for every agent) from it inside environment images,
# as the dev user. It checks the environment image requirements
# (https://docs.plural.sh/plural-features/devboxes/environment-images):
# every image in SUPPORTED must probe every agent, every image in UNSUPPORTED (no glibc) must report the missing
# glibc, and every image in OLD_GLIBC (older than 2.28) must say so in the failing agents' probe errors.
#
#   probe-matrix.sh <runtime image> [platform]
#
# An agent "probes" when its ACP handshake works: without credentials, session/new answering "auth required"
# counts, since that is the adapter talking.
set -euo pipefail

runtime=$1
platform=${2:-linux/amd64}
SUPPORTED=${SUPPORTED-"debian:trixie-slim debian:10-slim ubuntu:20.04 redhat/ubi8-minimal:latest amazonlinux:2023"}
UNSUPPORTED=${UNSUPPORTED-"alpine:3.22"}
OLD_GLIBC=${OLD_GLIBC-"amazonlinux:2"}
AGENTS=claude,codex,opencode,gemini,pi
digest=sha256:probe-matrix
# runtimemanifest.InstallID and InstallDirName: the digest and a hash of the agent selection.
id="${digest}+$(printf 'agents=%s\nbrowser=true\n' "$(echo "${AGENTS}" | tr , '\n' | LC_ALL=C sort -u | paste -sd, -)" | sha256sum | cut -c1-12)"
dir=/home/dev/.plural-runtime/$(echo "${id}" | tr ':+' '--')

# run_probe <env image>: prints the probe's JSON catalog.
run_probe() {
  local env=$1 vol
  vol=$(docker volume create)
  # shellcheck disable=SC2064 # the volume of this call, expanded now
  trap "docker volume rm -f ${vol} >/dev/null" RETURN
  docker run --rm --platform "${platform}" -v "${vol}:/home/dev" \
    --mount "type=image,source=${runtime},target=/rt" "${env}" \
    /rt/devbox-runtime-installer --src /rt/payload --dst /home/dev/.plural-runtime --digest "${digest}" \
      --agents "${AGENTS}" --browser --stay=false >/dev/null
  docker run --rm --platform "${platform}" -v "${vol}:/home/dev" "${env}" chown 1000:1000 /home/dev
  docker run --rm --platform "${platform}" --user 1000:1000 -v "${vol}:/home/dev" --tmpfs /tmp:exec \
    -e HOME=/home/dev -e DEVBOX_RUNTIME_DIR="${dir}" "${env}" \
    "${dir}/bin/devbox-daemon" probe --json --image-info /nonexistent --timeout 4m || true
}

fail=0
for env in ${SUPPORTED}; do
  echo "=== ${env} (supported)"
  out=$(run_probe "${env}" 2>/dev/null)
  echo "${out}" | jq -e .agents >/dev/null 2>&1 || { echo "probe failed to run: ${out:0:300}"; fail=1; continue; }
  echo "${out}" | jq -r '.agents[] | "\(.type)\t\(.probeStatus // "PROBE_STATUS_OK")\t\(.adapterVersion // "")\t\(.probeError // "" | .[0:160])"'
  bad=$(echo "${out}" | jq -r --arg want "${AGENTS}" '
    [.agents[] | select((.probeStatus // "PROBE_STATUS_OK") != "PROBE_STATUS_OK"
                  and ((.probeError // "") | test("auth|Authentication|log ?in|API key"; "i") | not)) | .type] | join(",")')
  n=$(echo "${out}" | jq '.agents | length')
  if [ -n "${bad}" ] || [ "${n}" -ne 5 ]; then
    echo "FAIL: ${n} agents probed, failing: ${bad:-none}"
    fail=1
  fi
done
for env in ${UNSUPPORTED}; do
  echo "=== ${env} (unsupported)"
  out=$(run_probe "${env}" 2>/dev/null)
  echo "${out}" | jq -e .agents >/dev/null 2>&1 || { echo "probe failed to run: ${out:0:300}"; fail=1; continue; }
  if ! echo "${out}" | jq -e 'all(.agents[]; (.probeError // "") | contains("glibc 2.28"))' >/dev/null; then
    echo "FAIL: expected every agent to report the missing glibc"
    echo "${out}" | jq -c '.agents[] | {type, probeStatus, probeError}'
    fail=1
  else
    echo "every agent reports the missing glibc"
  fi
done
for env in ${OLD_GLIBC}; do
  echo "=== ${env} (glibc older than 2.28)"
  out=$(run_probe "${env}" 2>/dev/null)
  echo "${out}" | jq -e .agents >/dev/null 2>&1 || { echo "probe failed to run: ${out:0:300}"; fail=1; continue; }
  # The Node-based adapters can't start; their probe errors must carry the loader's message.
  if ! echo "${out}" | jq -e '[.agents[] | select((.probeError // "") | contains("GLIBC_"))] | length > 0' >/dev/null; then
    echo "FAIL: expected agents to report the glibc version they need"
    echo "${out}" | jq -c '.agents[] | {type, probeStatus, probeError}'
    fail=1
  else
    echo "${out}" | jq -r '.agents[] | "\(.type)\t\(.probeStatus // "PROBE_STATUS_OK")\t\(.probeError // "" | .[0:160])"'
  fi
done
exit "${fail}"
