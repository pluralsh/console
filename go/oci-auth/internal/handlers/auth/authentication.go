package auth

import (
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

func authenticate(request *AuthenticationRequest) (*AuthenticationResponse, error) {
	if request == nil {
		return nil, fmt.Errorf("request cannot be nil")
	}

	switch request.Provider {
	case AWS:
		return authenticateAWS(request.AWS)
	case Azure:
		return authenticateAzure(request.Azure)
	case GCP:
		return authenticateGCP(request.GCP)
	case Basic:
		return authenticateBasic(request.Basic)
	}

	return nil, nil
}
