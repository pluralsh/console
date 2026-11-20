package egress

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	jose "github.com/go-jose/go-jose/v4"
	"github.com/go-jose/go-jose/v4/jwt"
)

const (
	jwksRefreshInterval = 10 * time.Minute
	// jwksMinRefetch bounds refetches triggered by unknown key IDs, so forged tokens can't hammer the issuer.
	jwksMinRefetch = 30 * time.Second
	jwtLeeway      = 30 * time.Second
)

var actorJWTAlgorithms = []jose.SignatureAlgorithm{jose.RS256, jose.RS384, jose.RS512, jose.ES256, jose.ES384, jose.ES512, jose.PS256, jose.EdDSA}

// actorVerifier verifies the Substrate actor JWTs egress injects (sub actor/<atespace>/<name>), discovering the
// issuer's keys with OpenID Connect discovery.
type actorVerifier struct {
	issuer   string
	audience string
	client   *http.Client
	now      func() time.Time

	mu          sync.Mutex
	keys        jose.JSONWebKeySet
	fetchedAt   time.Time
	lastAttempt time.Time
}

func newActorVerifier(issuer, audience, caFile string) (*actorVerifier, error) {
	if issuer == "" {
		return nil, errors.New("egress: ActorJWTIssuer is required to serve the devbox MCP")
	}
	if audience == "" {
		return nil, errors.New("egress: Gateway endpoint (or its Audience) is required to serve the devbox MCP")
	}
	client := &http.Client{Timeout: 10 * time.Second}
	if caFile != "" {
		raw, err := os.ReadFile(caFile)
		if err != nil {
			return nil, fmt.Errorf("egress: reading ActorJWTIssuerCAFile: %w", err)
		}
		pool := x509.NewCertPool()
		if !pool.AppendCertsFromPEM(raw) {
			return nil, fmt.Errorf("egress: ActorJWTIssuerCAFile %s holds no certificates", caFile)
		}
		client.Transport = &http.Transport{TLSClientConfig: &tls.Config{RootCAs: pool, MinVersion: tls.VersionTLS12}}
	}
	return &actorVerifier{issuer: strings.TrimSuffix(issuer, "/"), audience: audience, client: client, now: time.Now}, nil
}

type actorClaims struct {
	jwt.Claims
	Actor struct {
		Atespace  string `json:"atespace"`
		ActorName string `json:"actorName"`
		ActorUID  string `json:"actorUID"`
	} `json:"actor.ate.dev"`
}

// verify checks an actor JWT and returns the actor ID ("<atespace>/<name>").
func (v *actorVerifier) verify(ctx context.Context, raw string) (string, error) {
	tok, err := jwt.ParseSigned(raw, actorJWTAlgorithms)
	if err != nil {
		return "", fmt.Errorf("malformed token: %w", err)
	}
	if len(tok.Headers) != 1 {
		return "", errors.New("token must carry exactly one signature")
	}
	kid := tok.Headers[0].KeyID

	keys, err := v.keysFor(ctx, kid)
	if err != nil {
		return "", err
	}
	var claims actorClaims
	var verifyErr error
	for _, k := range keys {
		if verifyErr = tok.Claims(k.Key, &claims); verifyErr == nil {
			break
		}
	}
	if len(keys) == 0 {
		return "", fmt.Errorf("no issuer key matches key ID %q", kid)
	}
	if verifyErr != nil {
		return "", fmt.Errorf("invalid signature: %w", verifyErr)
	}
	if err := claims.ValidateWithLeeway(jwt.Expected{
		Issuer:      v.issuer,
		AnyAudience: jwt.Audience{v.audience},
		Time:        v.now(),
	}, jwtLeeway); err != nil {
		return "", fmt.Errorf("invalid claims: %w", err)
	}
	if claims.Expiry == nil {
		return "", errors.New("token has no expiry")
	}
	actor, err := ActorIDFromJWTSubject(claims.Subject)
	if err != nil {
		return "", err
	}
	if claims.Actor.Atespace != "" && claims.Actor.Atespace+"/"+claims.Actor.ActorName != actor {
		return "", errors.New("token subject and actor claim disagree")
	}
	return actor, nil
}

func (v *actorVerifier) keysFor(ctx context.Context, kid string) ([]jose.JSONWebKey, error) {
	v.mu.Lock()
	defer v.mu.Unlock()
	now := v.now()
	match := func() []jose.JSONWebKey {
		if kid == "" {
			return v.keys.Keys
		}
		return v.keys.Key(kid)
	}
	stale := now.Sub(v.fetchedAt) > jwksRefreshInterval
	if keys := match(); len(keys) > 0 && !stale {
		return keys, nil
	}
	if now.Sub(v.lastAttempt) < jwksMinRefetch && !v.fetchedAt.IsZero() {
		return match(), nil
	}
	v.lastAttempt = now
	set, err := v.fetchKeys(ctx)
	if err != nil {
		if keys := match(); len(keys) > 0 {
			return keys, nil
		}
		return nil, fmt.Errorf("fetching issuer keys: %w", err)
	}
	v.keys, v.fetchedAt = *set, now
	return match(), nil
}

func (v *actorVerifier) fetchKeys(ctx context.Context) (*jose.JSONWebKeySet, error) {
	var discovery struct {
		Issuer  string `json:"issuer"`
		JWKSURI string `json:"jwks_uri"`
	}
	if err := v.getJSON(ctx, v.issuer+"/.well-known/openid-configuration", &discovery); err != nil {
		return nil, err
	}
	if strings.TrimSuffix(discovery.Issuer, "/") != v.issuer {
		return nil, fmt.Errorf("discovery document names issuer %q, want %q", discovery.Issuer, v.issuer)
	}
	if discovery.JWKSURI == "" {
		return nil, errors.New("discovery document has no jwks_uri")
	}
	var set jose.JSONWebKeySet
	if err := v.getJSON(ctx, discovery.JWKSURI, &set); err != nil {
		return nil, err
	}
	return &set, nil
}

func (v *actorVerifier) getJSON(ctx context.Context, url string, out any) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return err
	}
	resp, err := v.client.Do(req)
	if err != nil {
		return err
	}
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("GET %s: %s", url, resp.Status)
	}
	return json.NewDecoder(io.LimitReader(resp.Body, 1<<20)).Decode(out)
}
