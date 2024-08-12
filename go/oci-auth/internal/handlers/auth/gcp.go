package auth

import (
	"context"
	"encoding/base64"
	"fmt"

	"github.com/fluxcd/pkg/oci/auth/gcp"
	"github.com/google/go-containerregistry/pkg/authn"
	"github.com/google/go-containerregistry/pkg/name"
)

const (
	jsonKeyUsername        = "_json_key"
	jsonKeyEncodedUsername = "_json_key_base64"
)

func authenticateGCP(ctx context.Context, url string, credentials *GCPCredentials) (*AuthenticationResponse, error) {
	// If credentials are provided in the request, then use them.
	if credentials != nil {
		return &AuthenticationResponse{
			AuthConfig: authn.AuthConfig{
				Username: GetUsername(credentials.ApplicationCredentials),
				Password: credentials.ApplicationCredentials,
			},
			Expiry: nil,
		}, nil
	}

	// Otherwise use default credentials.
	ref, err := name.ParseReference(url)
	if err != nil {
		return nil, fmt.Errorf("could not parse reference from %s url: %w", url, err)
	}

	auth, expiry, err := gcp.NewClient().LoginWithExpiry(ctx, true, url, ref)
	if err != nil {
		return nil, err
	}

	cfg, err := auth.Authorization()
	if err != nil {
		return nil, err
	}
	if cfg == nil {
		return nil, fmt.Errorf("no authorization configuration found")
	}

	return &AuthenticationResponse{
		AuthConfig: *cfg,
		Expiry:     &expiry,
	}, nil
}

// See: https://cloud.google.com/artifact-registry/docs/docker/authentication#json-key
func GetUsername(applicationCredentials string) string {
	_, err := base64.StdEncoding.DecodeString(applicationCredentials)
	if err == nil {
		return jsonKeyEncodedUsername
	}

	return jsonKeyUsername
}
