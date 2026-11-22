#!/usr/bin/env bash
# Copies the files this chart embeds verbatim from a Substrate checkout into
# files/ and the CRDs into crds/, at a given git ref (default: the chart's appVersion).
#
#   hack/sync-upstream.sh [SUBSTRATE_DIR] [REF]
#
# Run it when bumping appVersion, then review the diff: every other template
# mirrors manifests/ate-install by hand, so a change in an upstream Deployment
# also needs a matching template edit. CI runs it with --check to flag drift.
set -euo pipefail

CHECK=false
if [[ "${1:-}" == "--check" ]]; then
  CHECK=true
  shift
fi

CHART_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SUBSTRATE_DIR="${1:-${SUBSTRATE_DIR:-$CHART_DIR/../../../substrate}}"
REF="${2:-$(awk '/^appVersion:/ {gsub(/"/, "", $2); print $2}' "$CHART_DIR/Chart.yaml")}"

command -v yq >/dev/null || { echo "yq (mikefarah/yq v4) is required" >&2; exit 1; }
[[ -d "$SUBSTRATE_DIR/.git" ]] || { echo "no Substrate checkout at $SUBSTRATE_DIR" >&2; exit 1; }

OUT="$CHART_DIR/files"
CRDS="$CHART_DIR/crds"
if $CHECK; then
  OUT="$(mktemp -d)"
  CRDS="$OUT/crds"
  trap 'rm -rf "$OUT"' EXIT
fi
mkdir -p "$CRDS" "$OUT/envoy" "$OUT/sandboxconfig"

show() { git -C "$SUBSTRATE_DIR" show "$REF:$1"; }

for crd in csidriverconfigs sandboxconfigs workerpools; do
  show "manifests/ate-install/generated/ate.dev_${crd}.yaml" >"$CRDS/ate.dev_${crd}.yaml"
done

show manifests/ate-install/atenet-router.yaml |
  yq 'select(.kind == "ConfigMap" and .metadata.name == "atenet-router-envoy-config") | .data["envoy.yaml"]' \
    >"$OUT/envoy/router.yaml"

egress="$(show manifests/ate-install/atenet-egress.yaml)"
for key in envoy.yaml sds-servicedns-cert.yaml sds-actor-identity-validation.yaml \
  sds-podidentity-cert.yaml sds-servicedns-validation.yaml; do
  name="$key"
  [[ "$key" == "envoy.yaml" ]] && name="egress.yaml"
  yq "select(.kind == \"ConfigMap\" and .metadata.name == \"atenet-egress\") | .data[\"$key\"]" \
    <<<"$egress" >"$OUT/envoy/$name"
done

show manifests/ate-install/sandboxconfig-gvisor.yaml | yq 'select(.kind == "SandboxConfig")' \
  >"$OUT/sandboxconfig/gvisor.yaml"
show manifests/ate-install/sandboxconfig-microvm.yaml.tmpl | yq 'select(.kind == "SandboxConfig")' \
  >"$OUT/sandboxconfig/microvm.yaml"

commit="$(git -C "$SUBSTRATE_DIR" rev-parse "$REF^{commit}")"
printf 'ref: %s\ncommit: %s\n' "$REF" "$commit" >"$OUT/UPSTREAM"

if $CHECK; then
  if ! diff -ru "$CHART_DIR/files" "$OUT" -x scripts -x crds || ! diff -ru "$CHART_DIR/crds" "$CRDS"; then
    echo "files/ or crds/ is out of date with Substrate $REF; run hack/sync-upstream.sh" >&2
    exit 1
  fi
  echo "files/ and crds/ match Substrate $REF ($commit)"
fi
