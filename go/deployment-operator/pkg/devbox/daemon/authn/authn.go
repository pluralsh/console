// Package authn validates `devbox-request-token`, the JWT the gateway attaches to every Daemon call, against the
// JWKS delivered in Initialize. Only RS256 and ES256 are accepted; the JWS is verified with the standard library.
package authn

import (
	"crypto"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rsa"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"math/big"
	"strings"
	"sync"
	"time"
)

// Leeway tolerates clock skew between the gateway and the sandbox (a restored box's clock may lag briefly).
const Leeway = 2 * time.Minute

// Claims are the validated token claims.
type Claims struct {
	Issuer   string `json:"iss"`
	Subject  string `json:"sub"`
	Audience any    `json:"aud"`
	Expiry   int64  `json:"exp"`
	NotBef   int64  `json:"nbf"`
	Instance string `json:"instance"`
}

// HasAudience reports whether aud contains s.
func (c *Claims) HasAudience(s string) bool {
	switch v := c.Audience.(type) {
	case string:
		return v == s
	case []any:
		for _, a := range v {
			if a == s {
				return true
			}
		}
	}
	return false
}

type jwk struct {
	Kty string `json:"kty"`
	Kid string `json:"kid"`
	Alg string `json:"alg"`
	Use string `json:"use"`
	N   string `json:"n"`
	E   string `json:"e"`
	Crv string `json:"crv"`
	X   string `json:"x"`
	Y   string `json:"y"`
}

// Verifier holds the trusted keys.
type Verifier struct {
	mu   sync.RWMutex
	keys map[string]crypto.PublicKey
	// Instance, when set, must match the token's `instance` claim.
	instance string
	now      func() time.Time
}

// NewVerifier returns an empty verifier (it accepts nothing until keys are set).
func NewVerifier(now func() time.Time) *Verifier {
	if now == nil {
		now = time.Now
	}
	return &Verifier{keys: map[string]crypto.PublicKey{}, now: now}
}

// Configured reports whether keys are loaded.
func (v *Verifier) Configured() bool {
	v.mu.RLock()
	defer v.mu.RUnlock()
	return len(v.keys) > 0
}

// SetJWKS loads a JWKS document and the instance the tokens must name.
func (v *Verifier) SetJWKS(raw []byte, instance string) error {
	var doc struct {
		Keys []jwk `json:"keys"`
	}
	if err := json.Unmarshal(raw, &doc); err != nil {
		return fmt.Errorf("parse jwks: %w", err)
	}
	keys := map[string]crypto.PublicKey{}
	for _, k := range doc.Keys {
		pk, err := k.public()
		if err != nil {
			return fmt.Errorf("jwk %q: %w", k.Kid, err)
		}
		keys[k.Kid] = pk
	}
	if len(keys) == 0 {
		return errors.New("jwks has no keys")
	}
	v.mu.Lock()
	v.keys, v.instance = keys, instance
	v.mu.Unlock()
	return nil
}

func b64(s string) ([]byte, error) {
	return base64.RawURLEncoding.DecodeString(strings.TrimRight(s, "="))
}

func (k jwk) public() (crypto.PublicKey, error) {
	switch k.Kty {
	case "RSA":
		n, err := b64(k.N)
		if err != nil {
			return nil, err
		}
		e, err := b64(k.E)
		if err != nil {
			return nil, err
		}
		return &rsa.PublicKey{N: new(big.Int).SetBytes(n), E: int(new(big.Int).SetBytes(e).Int64())}, nil
	case "EC":
		if k.Crv != "P-256" {
			return nil, fmt.Errorf("unsupported curve %s", k.Crv)
		}
		x, err := b64(k.X)
		if err != nil {
			return nil, err
		}
		y, err := b64(k.Y)
		if err != nil {
			return nil, err
		}
		if len(x) > 32 || len(y) > 32 {
			return nil, errors.New("invalid P-256 coordinates")
		}
		point := make([]byte, 65)
		point[0] = 4
		copy(point[33-len(x):33], x)
		copy(point[65-len(y):], y)
		pk, err := ecdsa.ParseUncompressedPublicKey(elliptic.P256(), point)
		if err != nil {
			return nil, fmt.Errorf("invalid P-256 key: %w", err)
		}
		return pk, nil
	}
	return nil, fmt.Errorf("unsupported kty %s", k.Kty)
}

// Verify checks a compact JWS and its time claims.
func (v *Verifier) Verify(token string) (*Claims, error) {
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return nil, errors.New("malformed token")
	}
	hb, err := b64(parts[0])
	if err != nil {
		return nil, errors.New("malformed header")
	}
	var hdr struct {
		Alg string `json:"alg"`
		Kid string `json:"kid"`
	}
	if err := json.Unmarshal(hb, &hdr); err != nil {
		return nil, errors.New("malformed header")
	}
	sig, err := b64(parts[2])
	if err != nil {
		return nil, errors.New("malformed signature")
	}
	v.mu.RLock()
	key, ok := v.keys[hdr.Kid]
	if !ok && hdr.Kid == "" && len(v.keys) == 1 {
		for _, k := range v.keys {
			key, ok = k, true
		}
	}
	instance := v.instance
	v.mu.RUnlock()
	if !ok {
		return nil, fmt.Errorf("unknown key %q", hdr.Kid)
	}
	digest := sha256.Sum256([]byte(parts[0] + "." + parts[1]))
	switch hdr.Alg {
	case "RS256":
		pk, ok := key.(*rsa.PublicKey)
		if !ok || rsa.VerifyPKCS1v15(pk, crypto.SHA256, digest[:], sig) != nil {
			return nil, errors.New("bad signature")
		}
	case "ES256":
		pk, ok := key.(*ecdsa.PublicKey)
		if !ok || len(sig) != 64 {
			return nil, errors.New("bad signature")
		}
		r, s := new(big.Int).SetBytes(sig[:32]), new(big.Int).SetBytes(sig[32:])
		if !ecdsa.Verify(pk, digest[:], r, s) {
			return nil, errors.New("bad signature")
		}
	default:
		return nil, fmt.Errorf("unsupported alg %q", hdr.Alg)
	}
	pb, err := b64(parts[1])
	if err != nil {
		return nil, errors.New("malformed payload")
	}
	var c Claims
	if err := json.Unmarshal(pb, &c); err != nil {
		return nil, errors.New("malformed payload")
	}
	now := v.now()
	if c.Expiry == 0 || now.After(time.Unix(c.Expiry, 0).Add(Leeway)) {
		return nil, errors.New("token expired")
	}
	if c.NotBef != 0 && now.Add(Leeway).Before(time.Unix(c.NotBef, 0)) {
		return nil, errors.New("token not yet valid")
	}
	if instance != "" && c.Instance != "" && c.Instance != instance {
		return nil, errors.New("token is for another instance")
	}
	return &c, nil
}
