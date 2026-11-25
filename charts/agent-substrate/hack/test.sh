#!/usr/bin/env bash
# Static checks for the chart: helm lint and helm template for every ci/ values
# file, kubeconform on the rendered manifests, the helm-unittest suites and the
# secrets hook scripts against a fake kubectl.
#
# Needs helm (with the helm-unittest plugin), kubeconform, and sh + openssl
# for the hook script test. KUBE_VERSION picks the Kubernetes version to
# render and validate against.
set -euo pipefail

CHART_DIR="$(cd "$(dirname "$0")/.." && pwd)"
KUBE_VERSION="${KUBE_VERSION:-1.34.0}"
OUT="$(mktemp -d)"
trap 'rm -rf "$OUT"' EXIT

cd "$CHART_DIR"
if ! compgen -G 'charts/cloudnative-pg-*.tgz' >/dev/null; then
  helm dependency build . >/dev/null
fi

# The CRs this chart creates are only rendered inline when their CRDs are
# served; claim they are so the templates and kubeconform see them.
API_VERSIONS=(--api-versions postgresql.cnpg.io/v1/Cluster --api-versions postgresql.cnpg.io/v1/ScheduledBackup
  --api-versions postgresql.cnpg.io/v1/Database --api-versions ate.dev/v1/SandboxConfig
  --api-versions ate.dev/v1/CSIDriverConfig)

# JSON schemas for the ate.dev kinds, from the CRDs this chart ships.
mkdir -p "$OUT/schemas"
for crd in crds/*.yaml; do
  kind="$(yq '.spec.names.kind | downcase' "$crd")"
  for version in $(yq '.spec.versions[].name' "$crd"); do
    yq -o json ".spec.versions[] | select(.name == \"$version\") | .schema.openAPIV3Schema" "$crd" \
      >"$OUT/schemas/${kind}_${version}.json"
  done
done

status=0
for values in ci/*-values.yaml; do
  name="$(basename "$values" -values.yaml)"
  echo "== $name"
  if ! helm lint . --quiet --namespace ate-system --kube-version "$KUBE_VERSION" -f "$values"; then
    status=1
    continue
  fi
  # First install (CRs deferred to the bootstrap Job) and steady state.
  if ! helm template ate . --namespace ate-system --kube-version "$KUBE_VERSION" -f "$values" \
    >"$OUT/$name-first.yaml" ||
    ! helm template ate . --namespace ate-system --kube-version "$KUBE_VERSION" "${API_VERSIONS[@]}" -f "$values" \
      >"$OUT/$name.yaml"; then
    status=1
    continue
  fi
  # CNPG kinds validate against the CRDs catalog. CRDs themselves have no
  # schema there and are skipped.
  if ! kubeconform -strict -summary -kubernetes-version "$KUBE_VERSION" -ignore-missing-schemas \
    -schema-location default \
    -schema-location "$OUT/schemas/{{.ResourceKind}}_{{.ResourceAPIVersion}}.json" \
    -schema-location 'https://raw.githubusercontent.com/datreeio/CRDs-catalog/main/{{.Group}}/{{.ResourceKind}}_{{.ResourceAPIVersion}}.json' \
    "$OUT/$name-first.yaml" "$OUT/$name.yaml"; then
    status=1
  fi
  # With the devboxes preset, repeat the deployment-operator's
  # checkSubstrateInstall checks on the rendered objects (grep without -q:
  # under pipefail an early exit would fail the pipeline on SIGPIPE).
  if [ "$(yq '.devboxes.enabled // false' "$values")" = true ]; then
    gw="$(yq '.devboxes.gatewayNamespace // "plrl-deploy-operator"' "$values")"
    before="$status"
    status=0
    sel() { yq "select(.kind == \"$1\" and .metadata.name == \"$2\")" "$OUT/$name.yaml"; }
    args='[.spec.template.spec.initContainers[], .spec.template.spec.containers[]] | map((.command // []) + (.args // [])) | flatten | .[]'
    sel Deployment atenet-egress | yq "$args" | grep -F -- --credential-provider-name=plural.sh >/dev/null ||
      { echo "FAIL: atenet-egress lacks --credential-provider-name=plural.sh"; status=1; }
    sel ConfigMap atenet-egress | yq '.data[]' | grep -F "devbox-egress-authz.$gw.svc" >/dev/null ||
      { echo "FAIL: ConfigMap atenet-egress doesn't reference devbox-egress-authz.$gw.svc"; status=1; }
    sel Deployment atenet-router | yq "$args" | grep -F "spiffe://cluster.local/ns/$gw/sa/devbox-gateway" >/dev/null ||
      { echo "FAIL: atenet-router args lack the devbox-gateway SPIFFE ID"; status=1; }
    [ "$status" = 0 ] && echo "checkSubstrateInstall checks pass for $name"
    [ "$before" = 0 ] || status="$before"
  fi
done

echo "== unittest"
helm unittest . || status=1

echo "== secrets hook scripts"
"$CHART_DIR/hack/test-hook-scripts.sh" || status=1

exit "$status"
