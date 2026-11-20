package authn

import (
	"crypto"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"math/big"
	"testing"
	"time"
)

var enc = base64.RawURLEncoding

func sign(t *testing.T, alg, kid string, key crypto.Signer, claims map[string]any) string {
	t.Helper()
	h, _ := json.Marshal(map[string]any{"alg": alg, "kid": kid, "typ": "JWT"})
	p, _ := json.Marshal(claims)
	input := enc.EncodeToString(h) + "." + enc.EncodeToString(p)
	digest := sha256.Sum256([]byte(input))
	var sig []byte
	switch k := key.(type) {
	case *rsa.PrivateKey:
		sig, _ = rsa.SignPKCS1v15(rand.Reader, k, crypto.SHA256, digest[:])
	case *ecdsa.PrivateKey:
		r, s, _ := ecdsa.Sign(rand.Reader, k, digest[:])
		sig = append(r.FillBytes(make([]byte, 32)), s.FillBytes(make([]byte, 32))...)
	}
	return input + "." + enc.EncodeToString(sig)
}

func jwks(rsaKey *rsa.PrivateKey, ecKey *ecdsa.PrivateKey) []byte {
	ecPub, _ := ecKey.PublicKey.ECDH()
	raw := ecPub.Bytes() // 0x04 || X || Y
	doc := map[string]any{"keys": []any{
		map[string]any{"kty": "RSA", "kid": "r1", "n": enc.EncodeToString(rsaKey.N.Bytes()), "e": enc.EncodeToString(big.NewInt(int64(rsaKey.E)).Bytes())},
		map[string]any{"kty": "EC", "kid": "e1", "crv": "P-256", "x": enc.EncodeToString(raw[1:33]), "y": enc.EncodeToString(raw[33:])},
	}}
	b, _ := json.Marshal(doc)
	return b
}

func TestVerify(t *testing.T) {
	rsaKey, _ := rsa.GenerateKey(rand.Reader, 2048)
	ecKey, _ := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	now := time.Unix(1_800_000_000, 0)
	v := NewVerifier(func() time.Time { return now })
	if v.Configured() {
		t.Fatal("configured without keys")
	}
	if err := v.SetJWKS(jwks(rsaKey, ecKey), "inst-1"); err != nil {
		t.Fatal(err)
	}
	ok := map[string]any{"exp": now.Add(time.Minute).Unix(), "instance": "inst-1", "sub": "gateway"}
	for _, tc := range []struct {
		name string
		tok  string
		want bool
	}{
		{"rs256", sign(t, "RS256", "r1", rsaKey, ok), true},
		{"es256", sign(t, "ES256", "e1", ecKey, ok), true},
		{"wrong key", sign(t, "RS256", "e1", rsaKey, ok), false},
		{"unknown kid", sign(t, "RS256", "zz", rsaKey, ok), false},
		{"expired", sign(t, "RS256", "r1", rsaKey, map[string]any{"exp": now.Add(-time.Hour).Unix()}), false},
		{"other instance", sign(t, "ES256", "e1", ecKey, map[string]any{"exp": now.Add(time.Minute).Unix(), "instance": "inst-2"}), false},
		{"alg none", enc.EncodeToString([]byte(`{"alg":"none","kid":"r1"}`)) + "." + enc.EncodeToString([]byte(`{"exp":9999999999}`)) + ".", false},
		{"garbage", "a.b", false},
	} {
		_, err := v.Verify(tc.tok)
		if (err == nil) != tc.want {
			t.Errorf("%s: err=%v, want ok=%v", tc.name, err, tc.want)
		}
	}
	tampered := sign(t, "RS256", "r1", rsaKey, ok)
	tampered = tampered[:len(tampered)-4] + "AAAA"
	if _, err := v.Verify(tampered); err == nil {
		t.Error("tampered signature accepted")
	}
}
