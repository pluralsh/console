package auth

import (
	"context"
	"fmt"
	"time"

	"github.com/google/go-containerregistry/pkg/authn"
	"github.com/google/go-containerregistry/pkg/name"
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
	AssumeRoleARN   *string `json:"assumeRoleARN,omitempty"`
}

type AzureCredentials struct {
	SubscriptionID *string `json:"subscriptionID,omitempty"`
	TenantID       *string `json:"tenantID,omitempty"`
	ClientID       *string `json:"clientID,omitempty"`
	ClientSecret   *string `json:"clientSecret,omitempty"`
}

type GCPCredentials struct {
	ApplicationCredentials *string `json:"applicationCredentials,omitempty"`
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

	ref, err := name.ParseReference(request.URL)
	if err != nil {
		return nil, fmt.Errorf("could not parse reference from %s url: %w", request.URL, err)
	}

	switch request.Provider {
	case AWS:
		return authenticateAWS(ctx, request.AWS)
	case Azure:
		return authenticateAzure(ctx, request.Azure)
	case GCP:
		return authenticateGCP(ctx, request.URL, ref, request.GCP)
	case Basic:
		return authenticateBasic(request.Basic)
	}

	return nil, nil
}
