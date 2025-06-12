package steampipe

import (
	"fmt"
	"os"
)

type Provider string

const (
	ProviderAWS   Provider = "aws"
	ProviderAzure Provider = "azure"
	ProviderGCP   Provider = "gcp"
)

func NewAWSCredentials(accessKeyId, secretAccessKey *string) Credentials {
	return Credentials{
		Provider: ProviderAWS,
		AWS: &AWSCredentials{
			accessKeyId:     accessKeyId,
			secretAccessKey: secretAccessKey,
		},
	}
}

func NewAzureCredentials(subscriptionId, tenantId, clientId, clientSecret *string) Credentials {
	return Credentials{
		Provider: ProviderAzure,
		Azure: &AzureCredentials{
			subscriptionId: subscriptionId,
			tenantId:       tenantId,
			clientId:       clientId,
			clientSecret:   clientSecret,
		},
	}
}

func NewGCPCredentials(impersonateAccessToken *string) Credentials {
	return Credentials{
		Provider: ProviderGCP,
		GCP: &GCPCredentials{
			impersonateAccessToken: impersonateAccessToken,
		},
	}
}

type Credentials struct {
	Provider Provider
	AWS      *AWSCredentials
	Azure    *AzureCredentials
	GCP      *GCPCredentials
}

func (c *Credentials) AuthQuery() (string, error) {
	switch c.Provider {
	case ProviderAWS:
		if c.AWS == nil {
			return "", fmt.Errorf("AWS credentials are not set")
		}
		return c.AWS.AuthQuery(), nil
	case ProviderAzure:
		if c.Azure == nil {
			return "", fmt.Errorf("Azure credentials are not set")
		}
		return c.Azure.AuthQuery(), nil
	case ProviderGCP:
		if c.GCP == nil {
			return "", fmt.Errorf("GCP credentials are not set")
		}
		return c.GCP.AuthQuery(), nil
	default:
		return "", fmt.Errorf("unsupported provider: %s", c.Provider)
	}
}

type AWSCredentials struct {
	accessKeyId     *string
	secretAccessKey *string
}

func (c *AWSCredentials) AccessKeyId() string {
	if c != nil && c.accessKeyId != nil && *c.accessKeyId != "" {
		// Return the access key ID if it is set.
		return *c.accessKeyId
	}

	return os.Getenv("AWS_ACCESS_KEY_ID")
}

func (c *AWSCredentials) SecretAccessKey() string {
	if c != nil && c.secretAccessKey != nil && *c.secretAccessKey != "" {
		// Return the access key ID if it is set.
		return *c.secretAccessKey
	}

	return os.Getenv("AWS_SECRET_ACCESS_KEY")
}

func (c *AWSCredentials) AuthQuery() string {
	return fmt.Sprintf(`
			SELECT steampipe_configure_aws('
				access_key=%q
				secret_key=%q
			');
		`, c.AccessKeyId(), c.SecretAccessKey())
}

type AzureCredentials struct {
	subscriptionId *string
	tenantId       *string
	clientId       *string
	clientSecret   *string
}

func (c *AzureCredentials) SubscriptionId() string {
	if c != nil && c.subscriptionId != nil && *c.subscriptionId != "" {
		// Return the subscription ID if it is set.
		return *c.subscriptionId
	}

	return os.Getenv("AZURE_SUBSCRIPTION_ID")
}

func (c *AzureCredentials) TenantId() string {
	if c != nil && c.tenantId != nil && *c.tenantId != "" {
		// Return the tenant ID if it is set.
		return *c.tenantId
	}

	return os.Getenv("AZURE_TENANT_ID")
}

func (c *AzureCredentials) ClientId() string {
	if c != nil && c.clientId != nil && *c.clientId != "" {
		// Return the client ID if it is set.
		return *c.clientId
	}

	return os.Getenv("AZURE_CLIENT_ID")
}

func (c *AzureCredentials) ClientSecret() string {
	if c != nil && c.clientSecret != nil && *c.clientSecret != "" {
		// Return the client secret if it is set.
		return *c.clientSecret
	}

	return os.Getenv("AZURE_CLIENT_SECRET")
}

func (c *AzureCredentials) AuthQuery() string {
	return fmt.Sprintf(`
			SELECT steampipe_configure_gcp('
				subscription_id=%q
				tenant_id=%q
				client_id=%q
				client_secret=%q
			');
		`, c.SubscriptionId(), c.TenantId(), c.ClientId(), c.ClientSecret())
}

type GCPCredentials struct {
	impersonateAccessToken *string
}

func (c *GCPCredentials) ImpersonateAccessToken() string {
	if c != nil && c.impersonateAccessToken != nil && *c.impersonateAccessToken != "" {
		// Return the impersonate access token if it is set.
		return *c.impersonateAccessToken
	}

	return os.Getenv("GCP_IMPERSONATE_ACCESS_TOKEN")
}

func (c *GCPCredentials) AuthQuery() string {
	return fmt.Sprintf(`
			SELECT steampipe_configure_gcp('
				impersonate_access_token=%q
			');
		`, c.ImpersonateAccessToken())
}
