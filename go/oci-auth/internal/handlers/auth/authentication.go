package auth

import (
	"context"
	"fmt"
	"time"

	"github.com/google/go-containerregistry/pkg/authn"
)

type Provider string

const (
	AWS   Provider = "AWS"
	Azure Provider = "AZURE"
	GCP   Provider = "GCP"
	Basic Provider = "BASIC"
)

type AuthenticationRequest struct {
	URL      string            `json:"url"`
	Provider Provider          `json:"provider"`
	AWS      *AWSCredentials   `json:"aws,omitempty"`
	Azure    *AzureCredentials `json:"azure,omitempty"`
	GCP      *GCPCredentials   `json:"gcp,omitempty"`
	Basic    *BasicCredentials `json:"basic,omitempty"`
}

type AWSCredentials struct {
	AccessKeyID     *string `json:"accessKeyID,omitempty"`
	SecretAccessKey *string `json:"secretAccessKey,omitempty"`
	SessionToken    *string `json:"sessionToken,omitempty"`
	AssumeRoleARN   *string `json:"assumeRoleARN,omitempty"`
	Region          *string `json:"region,omitempty"`
}

type AzureCredentials struct {
	TenantID     string `json:"tenantID"`
	ClientID     string `json:"clientID"`
	ClientSecret string `json:"clientSecret"`
}

type GCPCredentials struct {
	ApplicationCredentials string `json:"applicationCredentials"`
}

type BasicCredentials struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type AuthenticationResponse struct {
	authn.AuthConfig
	Expiry *time.Time `json:"expiry,omitempty"`
}

func authenticate(ctx context.Context, request *AuthenticationRequest) (*AuthenticationResponse, error) {
	if request == nil {
		return nil, fmt.Errorf("request cannot be nil")
	}

	switch request.Provider {
	case AWS:
		return authenticateAWS(ctx, request.URL, request.AWS)
	case Azure:
		return authenticateAzure(ctx, request.URL, request.Azure)
	case GCP:
		return authenticateGCP(ctx, request.URL, request.GCP)
	case Basic:
		return authenticateBasic(request.Basic)
	default:
		return nil, fmt.Errorf("unknown auth provider: %q", request.Provider)
	}
}
