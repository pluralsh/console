#!/usr/bin/env bash
# Creates a kind cluster that can run Agent Substrate with gVisor and installs
# this chart into it with ci/kind-values.yaml (embedded RustFS, CNPG Postgres
# with the bundled operator, the gvisor-default SandboxConfig), then waits for
# every component to be ready.
#
# The cluster setup follows Substrate's hack/create-kind-cluster.sh: the
# ClusterTrustBundle and PodCertificateRequest feature gates the
# pod-certificate controller needs, certificates.k8s.io/v1beta1, parallel image
# pulls, and proxy ARP on the nodes for gVisor's pod-to-pod networking. gVisor
# itself ships inside atelet, so the nodes need nothing else.
#
# Environment:
#   KIND_CLUSTER_NAME  cluster to create (default agent-substrate)
#   KIND_VERSION       kind release run through `go run` when the local kind is
#                      older (default v0.33.0, as Substrate pins)
#   KIND_NODE_IMAGE    node image (default: kind's own)
#   SKIP_CREATE=1      install into the existing cluster
#   RELEASE            Helm release name (default ate)
#   TIMEOUT            Helm --timeout (default 20m)
#   EXTRA_HELM_ARGS    appended to helm upgrade --install
set -euo pipefail

CHART_DIR="$(cd "$(dirname "$0")/.." && pwd)"
KIND_CLUSTER_NAME="${KIND_CLUSTER_NAME:-agent-substrate}"
KIND_VERSION="${KIND_VERSION:-v0.33.0}"
RELEASE="${RELEASE:-ate}"
TIMEOUT="${TIMEOUT:-20m}"
NAMESPACE=ate-system
CONTEXT="kind-${KIND_CLUSTER_NAME}"

kind() {
  if command -v kind >/dev/null && [ "$(command kind version -q 2>/dev/null)" = "$KIND_VERSION" ]; then
    command kind "$@"
  else
    go run "sigs.k8s.io/kind@${KIND_VERSION}" "$@"
  fi
}

free_gb="$(df -Pk / | awk 'NR==2 {print int($4 / 1024 / 1024)}')"
if [ "$free_gb" -lt 50 ]; then
  echo "error: only ${free_gb} GB free on /; the install pulls a few GB of images and 50 GB should stay free" >&2
  exit 1
fi

if [ "${SKIP_CREATE:-}" != 1 ]; then
  config="$(mktemp)"
  trap 'rm -f "$config"' EXIT
  cat >"$config" <<'EOF'
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
- role: control-plane
# cmd/podcertcontroller depends on ClusterTrustBundle and PodCertificateRequest.
featureGates:
  ClusterTrustBundle: true
  ClusterTrustBundleProjection: true
  PodCertificateRequest: true
runtimeConfig:
  "certificates.k8s.io/v1beta1": "true"
kubeadmConfigPatches:
- |
  kind: KubeletConfiguration
  serializeImagePulls: false
  maxParallelImagePulls: 4
EOF
  if kind get clusters 2>/dev/null | grep -qx "$KIND_CLUSTER_NAME"; then
    echo "kind cluster $KIND_CLUSTER_NAME exists; reusing it"
  else
    echo "Creating kind cluster $KIND_CLUSTER_NAME..."
    kind create cluster --name "$KIND_CLUSTER_NAME" --config "$config" \
      ${KIND_NODE_IMAGE:+--image "$KIND_NODE_IMAGE"} --wait 120s
  fi
  echo "Enabling proxy ARP/NDP on the nodes (gVisor loopback pod-to-pod networking)..."
  for node in $(kind get nodes --name "$KIND_CLUSTER_NAME"); do
    docker exec "$node" sysctl -q net.ipv4.conf.all.proxy_arp=1
    docker exec "$node" sysctl -q -e net.ipv6.conf.all.proxy_ndp=1
  done
fi

cd "$CHART_DIR"
if ! compgen -G 'charts/cloudnative-pg-*.tgz' >/dev/null; then
  helm repo add cnpg https://cloudnative-pg.github.io/charts >/dev/null 2>&1 || true
  helm dependency build .
fi

echo "Installing $RELEASE into $CONTEXT/$NAMESPACE..."
# shellcheck disable=SC2086
helm upgrade --install "$RELEASE" . --kube-context "$CONTEXT" --namespace "$NAMESPACE" --create-namespace \
  -f ci/kind-values.yaml --wait --wait-for-jobs --timeout "$TIMEOUT" ${EXTRA_HELM_ARGS:-}

k() { kubectl --context "$CONTEXT" "$@"; }
echo "Waiting for Postgres, the SandboxConfig and every workload..."
k -n "$NAMESPACE" wait --for=condition=Ready --timeout=10m cluster.postgresql.cnpg.io/ate-postgres
k wait --for=jsonpath='{.metadata.name}'=gvisor-default --timeout=2m sandboxconfig.ate.dev/gvisor-default
k -n "$NAMESPACE" rollout status --timeout=10m daemonset/atelet
for d in $(k -n "$NAMESPACE" get deploy -o name); do
  k -n "$NAMESPACE" rollout status --timeout=10m "$d"
done
k -n podcertificate-controller-system rollout status --timeout=5m deploy/podcertificate-controller

echo
k -n "$NAMESPACE" get pods -o wide
echo
echo "Agent Substrate is up in $CONTEXT. Delete the cluster with:"
echo "  go run sigs.k8s.io/kind@${KIND_VERSION} delete cluster --name ${KIND_CLUSTER_NAME}"
