package auth

import (
	"context"
	"fmt"

	"github.com/fluxcd/pkg/oci/auth/gcp"
	"github.com/google/go-containerregistry/pkg/name"
)

func authenticateGCP(ctx context.Context, url string, ref name.Reference, credentials *GCPCredentials) (*AuthenticationResponse, error) {
	// Use default credentials if no credentials found in the request.
	if credentials == nil {
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

	// TODO: Use service account as password: https://cloud.google.com/artifact-registry/docs/docker/authentication#json-key.

	return nil, nil
}
