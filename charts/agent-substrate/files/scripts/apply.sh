#!/bin/sh
# Creates the secrets generate.sh produced, but only those that don't exist:
# regenerating a CA or JWT pool would rotate it out from under every
# certificate and token already issued. Also writes the derived objects that
# are safe to rewrite (actor-id-ca-certs, ate-api-authentication). Runs in an
# image with sh and kubectl.
set -eu
# busybox ash and bash both have pipefail; a failed kubectl get must not
# feed an empty value downstream.
set -o pipefail

WORK="${WORK:-/work}"
NS="${NAMESPACE:?}"
PODCERT_NS="${PODCERT_NAMESPACE:?}"

# create_secret <namespace> <name> <type> <key>...
create_secret() {
  ns="$1" name="$2" type="$3"
  shift 3
  if kubectl get secret -n "$ns" "$name" >/dev/null 2>&1; then
    echo "secret $ns/$name exists; keeping it"
    return 0
  fi
  set -- $(for key in "$@"; do printf -- '--from-file=%s=%s/%s/%s ' "$key" "$WORK" "$name" "$key"; done)
  if out="$(kubectl create secret generic -n "$ns" "$name" --type="$type" "$@" 2>&1)"; then
    echo "created secret $ns/$name"
  elif echo "$out" | grep -q AlreadyExists; then
    # A concurrent run won the race; its material stands.
    echo "secret $ns/$name was created concurrently; keeping it"
  else
    echo "$out" >&2
    return 1
  fi
}

# Every Substrate workload certificate is a pod certificate, so without these
# APIs every component crash-loops on missing credential bundles. Fail here,
# before anything is created, instead.
served() {
  for version in v1 v1beta1; do
    kubectl get --raw "/apis/certificates.k8s.io/$version" 2>/dev/null | grep -q "\"name\":\"$1\"" && return 0
  done
  return 1
}
missing=""
for resource in podcertificaterequests clustertrustbundles; do
  served "$resource" || missing="$missing $resource"
done
if [ -n "$missing" ]; then
  echo "agent-substrate needs pod certificates, but certificates.k8s.io (v1 or v1beta1) doesn't serve:$missing." >&2
  echo "They are on by default from Kubernetes 1.37; on 1.34-1.36 enable the PodCertificateRequest, ClusterTrustBundle" >&2
  echo "and ClusterTrustBundleProjection feature gates and the certificates.k8s.io/v1beta1 API. Managed clusters" >&2
  echo "(EKS, GKE, AKS) can't enable them, so they need 1.37+." >&2
  exit 1
fi

# The pod-certificate controller's namespace must exist before its CA pools.
# It isn't a Helm release resource (Helm can't adopt what a hook created
# mid-install), so it outlives uninstall with the pools.
if ! kubectl get namespace "$PODCERT_NS" >/dev/null 2>&1; then
  kubectl create namespace "$PODCERT_NS" 2>&1 | grep -v AlreadyExists || true
  kubectl get namespace "$PODCERT_NS" >/dev/null
fi

create_secret "$NS" actor-id-jwt-pool Opaque pool
create_secret "$NS" actor-id-ca-pool kubernetes.io/tls pool tls.crt tls.key
create_secret "$NS" egress-mitm-ca-pool kubernetes.io/tls pool tls.crt tls.key
create_secret "$PODCERT_NS" service-dns-ca-pool kubernetes.io/tls pool tls.crt tls.key
create_secret "$PODCERT_NS" pod-identity-ca-pool kubernetes.io/tls pool tls.crt tls.key
create_secret "$PODCERT_NS" postgres-ca-pool kubernetes.io/tls pool tls.crt tls.key
if [ -n "${PG_READ_WRITE_SECRET:-}" ]; then
  create_secret "$NS" "$PG_READ_WRITE_SECRET" kubernetes.io/basic-auth username password
fi

# actor-id-ca-certs publishes just the root of actor-id-ca-pool, which the
# egress gateway verifies actor client certificates against. Kept in sync.
kubectl get secret -n "$NS" actor-id-ca-pool -o jsonpath='{.data.tls\.crt}' | base64 -d >"$WORK/actor-id-ca.crt"
[ -s "$WORK/actor-id-ca.crt" ] || { echo "actor-id-ca-pool has no tls.crt" >&2; exit 1; }
kubectl create secret generic -n "$NS" actor-id-ca-certs --from-file=ca.crt="$WORK/actor-id-ca.crt" \
  --dry-run=client -o yaml >"$WORK/actor-id-ca-certs.yaml"
kubectl apply -f "$WORK/actor-id-ca-certs.yaml"

# ate-api-server's authentication config, trusting the cluster's service
# account issuer: EXPECTED_JWT_ISSUER, else the OIDC discovery document, else
# the in-cluster default.
issuer="${EXPECTED_JWT_ISSUER:-}"
if [ -z "$issuer" ]; then
  issuer="$(kubectl get --raw /.well-known/openid-configuration 2>/dev/null |
    sed -n 's/.*"issuer"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')" || true
fi
issuer="${issuer:-https://kubernetes.default.svc}"
{
  echo "jwtProviders:"
  echo "- audiences:"
  echo "  - api.$NS.svc"
  case "$issuer" in
    https://kubernetes.default.svc | https://kubernetes.default.svc.cluster.local)
      echo "  certificateAuthorityFile: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt"
      echo "  discoveryTokenFile: /var/run/secrets/kubernetes.io/serviceaccount/token"
      ;;
  esac
  echo "  issuer: $issuer"
  echo "  name: kubernetes"
} >"$WORK/authentication.yaml"
echo "ate-api-authentication authentication.yaml:"
sed 's/^/  | /' "$WORK/authentication.yaml"
kubectl create configmap -n "$NS" ate-api-authentication --from-file=authentication.yaml="$WORK/authentication.yaml" \
  --dry-run=client -o yaml >"$WORK/ate-api-authentication.yaml"
kubectl apply -f "$WORK/ate-api-authentication.yaml"
