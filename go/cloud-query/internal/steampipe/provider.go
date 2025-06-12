package steampipe

import "os"

type Provider string

const (
	ProviderAWS   Provider = "aws"
	ProviderAzure Provider = "azure"
)

type Credentials struct {
	AWS   *AWSCredentials
	Azure *AzureCredentials
}

func NewAWSCredentials(accessKeyId, secretAccessKey *string) Credentials {
	return Credentials{
		AWS: &AWSCredentials{
			accessKeyId:     accessKeyId,
			secretAccessKey: secretAccessKey,
		},
	}
}

func NewAzureCredentials(subscriptionId, tenantId, clientId, clientSecret *string) Credentials {
	return Credentials{
		Azure: &AzureCredentials{
			subscriptionId: subscriptionId,
			tenantId:       tenantId,
			clientId:       clientId,
			clientSecret:   clientSecret,
		},
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
