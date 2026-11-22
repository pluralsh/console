#!/bin/sh
# Runs the secrets hook scripts (files/scripts) against hack/fake-kubectl.sh
# and checks that they generate well-formed pools and never replace a secret
# that already exists.
#
# Needs sh and OpenSSL 3. Without a local OpenSSL 3 (macOS ships LibreSSL) it
# re-runs itself in the hook's own openssl image through docker.
set -eu

CHART_DIR="$(cd "$(dirname "$0")/.." && pwd)"
OPENSSL_IMAGE="${OPENSSL_IMAGE:-alpine/openssl:3.5.9}"

if ! openssl version 2>/dev/null | grep -q '^OpenSSL 3'; then
  if [ -z "${IN_CONTAINER:-}" ] && command -v docker >/dev/null; then
    exec docker run --rm -e IN_CONTAINER=1 -v "$CHART_DIR:/chart:ro" --entrypoint /bin/sh \
      "$OPENSSL_IMAGE" /chart/hack/test-hook-scripts.sh
  fi
  echo "needs OpenSSL 3 (or docker)" >&2
  exit 1
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
mkdir -p "$TMP/bin"
cp "$CHART_DIR/hack/fake-kubectl.sh" "$TMP/bin/kubectl"
chmod +x "$TMP/bin/kubectl"
PATH="$TMP/bin:$PATH"
export FAKE_STATE="$TMP/state" NAMESPACE=ate-system PODCERT_NAMESPACE=podcertificate-controller-system \
  PG_READ_WRITE_SECRET=ate-postgres-readwrite PG_READ_WRITE_USER=substrate_readwrite_user
mkdir -p "$FAKE_STATE"

failures=0
fail() { echo "FAIL: $*"; failures=$((failures + 1)); }
pass() { echo "ok: $*"; }

secrets="ate-system/actor-id-jwt-pool ate-system/actor-id-ca-pool ate-system/egress-mitm-ca-pool
podcertificate-controller-system/service-dns-ca-pool podcertificate-controller-system/pod-identity-ca-pool
podcertificate-controller-system/postgres-ca-pool ate-system/ate-postgres-readwrite"

run_hook() {
  rm -rf "$TMP/work" && mkdir -p "$TMP/work"
  WORK="$TMP/work" sh "$CHART_DIR/files/scripts/generate.sh" >/dev/null 2>&1
  WORK="$TMP/work" sh "$CHART_DIR/files/scripts/apply.sh" >"$TMP/apply.log" 2>&1 || {
    cat "$TMP/apply.log"
    return 1
  }
}

fingerprint() {
  for s in $secrets; do
    find "$FAKE_STATE/secret/$s" -type f | sort | while read -r f; do cksum "$f"; done
  done
}

field() { sed -n "s/.*\"$2\":\"\\([^\"]*\\)\".*/\\1/p" "$1"; }

# 1. A fresh install creates every secret.
run_hook || fail "first run failed"
for s in $secrets; do
  [ -d "$FAKE_STATE/secret/$s" ] || fail "first run didn't create $s"
done
[ -d "$FAKE_STATE/namespace/_/podcertificate-controller-system" ] || fail "podcert namespace not created"
pass "first run created every secret"

# 2. The pools are well formed.
pool="$FAKE_STATE/secret/ate-system/actor-id-ca-pool"
[ "$(cat "$pool/.type")" = kubernetes.io/tls ] || fail "actor-id-ca-pool type"
field "$pool/pool" RootCertificateDER | base64 -d | openssl x509 -inform DER -noout 2>/dev/null ||
  fail "actor-id-ca-pool RootCertificateDER doesn't parse"
for p in $secrets; do
  f="$FAKE_STATE/secret/$p/pool"
  [ -f "$f" ] || continue
  # pkcs8 -nocrypt only reads PKCS#8 PrivateKeyInfo, not SEC1 or PKCS#1.
  field "$f" SigningKeyPKCS8 | base64 -d | openssl pkcs8 -inform DER -nocrypt -out /dev/null 2>/dev/null ||
    fail "$p SigningKeyPKCS8 isn't PKCS#8"
done
openssl x509 -in "$pool/tls.crt" -noout -text | grep -q 'CA:TRUE' || fail "actor-id-ca-pool root isn't a CA"
openssl x509 -in "$pool/tls.crt" -noout -text | grep -q 'id-ecPublicKey' || fail "actor-id-ca-pool isn't ECDSA"
openssl x509 -in "$FAKE_STATE/secret/podcertificate-controller-system/postgres-ca-pool/tls.crt" -noout -text |
  grep -q ED25519 || fail "postgres-ca-pool isn't Ed25519"
jwt="$FAKE_STATE/secret/ate-system/actor-id-jwt-pool/pool"
kid="$(field "$jwt" ID)"
want="$(field "$jwt" SigningKeyPKCS8 | base64 -d | openssl pkey -inform DER -pubout -outform DER |
  openssl dgst -sha256 -binary | base64 | tr '+/' '-_' | tr -d '=')"
[ -n "$kid" ] && [ "$kid" = "$want" ] || fail "JWT key ID $kid isn't the public key thumbprint $want"
[ "$(field "$jwt" ActiveForSigning)" = "$kid" ] || fail "JWT pool doesn't sign with its key"
cmp -s "$FAKE_STATE/secret/ate-system/actor-id-ca-certs/ca.crt" "$pool/tls.crt" ||
  fail "actor-id-ca-certs isn't actor-id-ca-pool's root"
[ "$(cat "$FAKE_STATE/secret/ate-system/ate-postgres-readwrite/username")" = substrate_readwrite_user ] ||
  fail "read-write username"
pass "pools are well formed"

# 3. Re-running (helm upgrade) keeps every secret.
before="$(fingerprint)"
run_hook || fail "second run failed"
[ "$(fingerprint)" = "$before" ] || fail "second run changed existing secrets"
[ "$(grep -c 'exists; keeping it' "$TMP/apply.log")" -eq 7 ] || fail "second run didn't keep all 7 secrets"
pass "upgrade keeps existing secrets"

# 4. A deleted secret is recreated; the others stay.
rm -rf "$FAKE_STATE/secret/ate-system/egress-mitm-ca-pool"
keep="$(for s in $secrets; do [ "$s" = ate-system/egress-mitm-ca-pool ] || find "$FAKE_STATE/secret/$s" -type f | sort | while read -r f; do cksum "$f"; done; done)"
run_hook || fail "third run failed"
[ -d "$FAKE_STATE/secret/ate-system/egress-mitm-ca-pool" ] || fail "deleted secret not recreated"
after="$(for s in $secrets; do [ "$s" = ate-system/egress-mitm-ca-pool ] || find "$FAKE_STATE/secret/$s" -type f | sort | while read -r f; do cksum "$f"; done; done)"
[ "$after" = "$keep" ] || fail "recreating one secret touched others"
pass "a deleted secret is recreated alone"

# 5. Losing a create race keeps the winner's secret.
before="$(fingerprint)"
(export FAKE_RACE=actor-id-jwt-pool && run_hook) || fail "run that lost a create race failed"
[ "$(fingerprint)" = "$before" ] || fail "losing a create race changed a secret"
grep -q 'created concurrently; keeping it' "$TMP/apply.log" || fail "race not reported"
pass "a lost create race keeps the existing secret"

# 6. The authentication config follows the discovered or configured issuer.
auth="$FAKE_STATE/configmap/ate-system/ate-api-authentication/authentication.yaml"
(export FAKE_ISSUER=https://kubernetes.default.svc.cluster.local && run_hook)
grep -q '  issuer: https://kubernetes.default.svc.cluster.local' "$auth" || fail "discovered issuer not used"
grep -q 'certificateAuthorityFile: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt' "$auth" ||
  fail "in-cluster issuer lacks the service account CA"
grep -q '  - api.ate-system.svc' "$auth" || fail "audience"
(export FAKE_ISSUER=https://oidc.eks.us-east-2.amazonaws.com/id/ABC && run_hook)
grep -q '  issuer: https://oidc.eks.us-east-2.amazonaws.com/id/ABC' "$auth" || fail "EKS issuer not used"
! grep -q certificateAuthorityFile "$auth" || fail "external issuer got the in-cluster CA"
(export EXPECTED_JWT_ISSUER=https://container.googleapis.com/v1/projects/p/locations/l/clusters/c FAKE_ISSUER=https://ignored && run_hook)
grep -q 'issuer: https://container.googleapis.com/v1/projects/p/locations/l/clusters/c' "$auth" ||
  fail "EXPECTED_JWT_ISSUER not preferred"
run_hook
grep -q '  issuer: https://kubernetes.default.svc$' "$auth" || fail "no discovery doesn't fall back to the in-cluster issuer"
pass "authentication config follows the issuer"

# 7. Pod certificates are required, from certificates.k8s.io v1 or v1beta1.
(export FAKE_PODCERT_VERSION=v1beta1 && run_hook) || fail "v1beta1 pod certificates rejected"
rm -rf "$FAKE_STATE" && mkdir -p "$FAKE_STATE"
if (export FAKE_PODCERT_VERSION= && run_hook) >/dev/null; then
  fail "install proceeded without pod certificates"
fi
grep -q "doesn't serve: podcertificaterequests clustertrustbundles" "$TMP/apply.log" || fail "missing APIs not reported"
[ ! -d "$FAKE_STATE/secret" ] || fail "secrets created without pod certificates"
pass "pod certificate APIs are required"

if [ "$failures" -gt 0 ]; then
  echo "$failures failure(s)"
  exit 1
fi
echo "secrets hook scripts: all checks passed"
