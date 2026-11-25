#!/bin/sh
# Generates the key material ate-setup creates (cmd/ate-setup/internal/steps/
# create.go) into $WORK/<secret>/<key>. Runs in an image with sh and openssl;
# apply.sh then creates only the secrets that don't exist yet, so material
# generated here for an existing secret is discarded.
#
# Formats match internal/localca and internal/localjwtauthority:
#   CA pool:  {"CAs":[{"ID":"1","SigningKeyPKCS8":<b64 DER>,"RootCertificateDER":<b64 DER>}],"ActiveForSigning":"1"}
#   JWT pool: {"Authorities":[{"ID":<thumbprint>,"Algorithm":"ES256","SigningKeyPKCS8":<b64 DER>}],"ActiveForSigning":<thumbprint>}
# where the JWT key ID is base64url(sha256(PKIX DER public key)), unpadded.
set -eu

WORK="${WORK:-/work}"
DAYS="${CA_VALIDITY_DAYS:-365}"
JWT_ALGORITHM="${JWT_ALGORITHM:-ES256}"

b64() { base64 | tr -d '\n'; }

# Go's x509.ParsePKCS8PrivateKey wants PKCS#8; `openssl pkey -outform DER`
# writes EC keys as SEC1.
pkcs8_der() { openssl pkcs8 -topk8 -nocrypt -in "$1" -outform DER | b64; }

# ca_pool <secret> <ed25519|p256>
ca_pool() {
  dir="$WORK/$1"
  mkdir -p "$dir"
  case "$2" in
    ed25519) openssl genpkey -algorithm ed25519 -out "$dir/tls.key" ;;
    p256) openssl genpkey -algorithm EC -pkeyopt ec_paramgen_curve:P-256 \
      -pkeyopt ec_param_enc:named_curve -out "$dir/tls.key" ;;
  esac
  cat >"$dir/req.cnf" <<EOF
[req]
distinguished_name = dn
x509_extensions = v3
prompt = no
[dn]
CN = $(openssl rand -hex 16)
[v3]
basicConstraints = critical,CA:TRUE
keyUsage = critical,digitalSignature,keyCertSign
subjectKeyIdentifier = hash
EOF
  openssl req -x509 -new -config "$dir/req.cnf" -key "$dir/tls.key" -days "$DAYS" -out "$dir/tls.crt"
  key="$(pkcs8_der "$dir/tls.key")"
  cert="$(openssl x509 -in "$dir/tls.crt" -outform DER | b64)"
  printf '{"CAs":[{"ID":"1","SigningKeyPKCS8":"%s","RootCertificateDER":"%s"}],"ActiveForSigning":"1"}' \
    "$key" "$cert" >"$dir/pool"
  rm -f "$dir/req.cnf"
}

# jwt_pool <secret>
jwt_pool() {
  dir="$WORK/$1"
  mkdir -p "$dir"
  case "$JWT_ALGORITHM" in
    ES256) openssl genpkey -algorithm EC -pkeyopt ec_paramgen_curve:P-256 \
      -pkeyopt ec_param_enc:named_curve -out "$dir/key.pem" ;;
    RS256) openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out "$dir/key.pem" ;;
    *) echo "unsupported JWT algorithm $JWT_ALGORITHM" >&2; exit 1 ;;
  esac
  kid="$(openssl pkey -in "$dir/key.pem" -pubout -outform DER | openssl dgst -sha256 -binary | b64 | tr '+/' '-_' | tr -d '=')"
  key="$(pkcs8_der "$dir/key.pem")"
  printf '{"Authorities":[{"ID":"%s","Algorithm":"%s","SigningKeyPKCS8":"%s"}],"ActiveForSigning":"%s"}' \
    "$kid" "$JWT_ALGORITHM" "$key" "$kid" >"$dir/pool"
  rm -f "$dir/key.pem"
}

# password <secret> <username>
password() {
  dir="$WORK/$1"
  mkdir -p "$dir"
  printf '%s' "$2" >"$dir/username"
  openssl rand -hex 32 | tr -d '\n' >"$dir/password"
}

jwt_pool actor-id-jwt-pool
ca_pool actor-id-ca-pool p256
ca_pool egress-mitm-ca-pool p256
ca_pool service-dns-ca-pool ed25519
ca_pool pod-identity-ca-pool ed25519
ca_pool postgres-ca-pool ed25519
if [ -n "${PG_READ_WRITE_SECRET:-}" ]; then
  password "$PG_READ_WRITE_SECRET" "$PG_READ_WRITE_USER"
fi
if [ -n "${PG_JUICEFS_SECRET:-}" ]; then
  password "$PG_JUICEFS_SECRET" "$PG_JUICEFS_USER"
fi
echo "generated candidate key material in $WORK"
