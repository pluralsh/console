package auth

import (
	"fmt"

	"github.com/google/go-containerregistry/pkg/authn"
)

func authenticateBasic(credentials *BasicCredentials) (*AuthenticationResponse, error) {
	if credentials == nil {
		return nil, fmt.Errorf("no basic credentials provided")
	}

	return &AuthenticationResponse{
		AuthConfig: authn.AuthConfig{
			Username: credentials.Username,
			Password: credentials.Password,
		},
		Expiry: nil,
	}, nil
}
