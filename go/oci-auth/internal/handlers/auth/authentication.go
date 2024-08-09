package auth

import (
	"time"

	"github.com/Azure/azure-sdk-for-go/sdk/azidentity"
	"github.com/fluxcd/pkg/oci/auth/aws"
	"github.com/fluxcd/pkg/oci/auth/azure"
	"github.com/fluxcd/pkg/oci/auth/gcp"
	"github.com/google/go-containerregistry/pkg/authn"
)

type Provider string

const (
	AWS   Provider = "AWS"
	Azure Provider = "AZURE"
	GCP   Provider = "GCP"
)

type AuthenticationRequest struct {
	URL      string            `json:"url"`
	Provider Provider          `json:"provider"`
	AWS      *AWSCredentials   `json:"aws,omitempty"`
	Azure    *AzureCredentials `json:"azure,omitempty"`
	GCP      *AWSCredentials   `json:"gcp,omitempty"`
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

type AuthenticationResponse struct {
	authn.AuthConfig
	Expiry *time.Time `json:"expiry,omitempty"`
}

func authenticate(request *AuthenticationRequest) (*AuthenticationResponse, error) {
	aws.NewClient().WithConfig(nil)
	azure.NewClient().WithTokenCredential(nil)
	gcp.NewClient().WithTokenURL("")
	_, _ = azidentity.NewManagedIdentityCredential(nil)

	return nil, nil
}
