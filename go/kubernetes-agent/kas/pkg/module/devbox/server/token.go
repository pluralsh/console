package server

import (
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const DefaultStreamTokenAudience = "kas-devbox-streams"

var (
	errStreamTokenInvalid  = errors.New("invalid stream token")
	errStreamTokenStream   = errors.New("stream token is for a different stream")
	errStreamTokenInstance = errors.New("stream token is for a different instance")
)

// StreamClaims are the claims of a browser stream token minted by console (Console.Devboxes.StreamToken).
// Console writes both the long and the short form of the cluster and instance claims.
type StreamClaims struct {
	jwt.RegisteredClaims
	ClusterID  string `json:"cluster_id,omitempty"`
	Cluster    string `json:"cluster,omitempty"`
	InstanceID string `json:"instance_id,omitempty"`
	Instance   string `json:"instance,omitempty"`
	StreamID   string `json:"stream_id,omitempty"`
	Kind       string `json:"kind,omitempty"`
}

func (c *StreamClaims) ClusterId() string {
	if c.ClusterID != "" {
		return c.ClusterID
	}
	return c.Cluster
}

func (c *StreamClaims) InstanceId() string {
	if c.InstanceID != "" {
		return c.InstanceID
	}
	return c.Instance
}

type streamTokenValidator struct {
	key      []byte
	audience string
	leeway   time.Duration
	now      func() time.Time
}

// validate checks the token's signature (HMAC only), audience and expiry, and that it was minted for streamId
// and, when instanceId is not empty, for that instance.
func (v *streamTokenValidator) validate(token, streamId, instanceId string) (*StreamClaims, error) {
	claims := &StreamClaims{}
	opts := []jwt.ParserOption{
		jwt.WithValidMethods([]string{
			jwt.SigningMethodHS256.Alg(),
			jwt.SigningMethodHS384.Alg(),
			jwt.SigningMethodHS512.Alg(),
		}),
		jwt.WithAudience(v.audience),
		jwt.WithExpirationRequired(),
		jwt.WithIssuedAt(),
		jwt.WithLeeway(v.leeway),
	}
	if v.now != nil {
		opts = append(opts, jwt.WithTimeFunc(v.now))
	}
	_, err := jwt.ParseWithClaims(token, claims, func(*jwt.Token) (any, error) {
		return v.key, nil
	}, opts...)
	if err != nil {
		return nil, fmt.Errorf("%w: %w", errStreamTokenInvalid, err)
	}
	switch {
	case claims.StreamID == "":
		return nil, fmt.Errorf("%w: missing stream_id", errStreamTokenInvalid)
	case claims.ClusterId() == "":
		return nil, fmt.Errorf("%w: missing cluster_id", errStreamTokenInvalid)
	case claims.InstanceId() == "":
		return nil, fmt.Errorf("%w: missing instance_id", errStreamTokenInvalid)
	case claims.StreamID != streamId:
		return nil, errStreamTokenStream
	case instanceId != "" && claims.InstanceId() != instanceId:
		return nil, errStreamTokenInstance
	}
	return claims, nil
}
