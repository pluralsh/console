package config

import (
	"fmt"
)

type Configuration struct {
	provider Provider
	aws      *AWSConfiguration
	azure    *AzureConfiguration
	gcp      *GCPConfiguration
}

func (c *Configuration) Provider() Provider {
	return c.provider
}

func (c *Configuration) Query() (string, error) {
	switch c.provider {
	case ProviderAWS:
		if c.aws == nil {
			return "", fmt.Errorf("AWS configuration is not set")
		}
		return c.aws.Query(), nil
	case ProviderAzure:
		if c.azure == nil {
			return "", fmt.Errorf("Azure configuration is not set")
		}
		return c.azure.Query(), nil
	case ProviderGCP:
		if c.gcp == nil {
			return "", fmt.Errorf("GCP configuration is not set")
		}
		return c.gcp.Query(), nil
	default:
		return "", fmt.Errorf("unsupported provider: %s", c.provider)
	}
}

func NewAWSConfiguration(accessKeyId, secretAccessKey *string) Configuration {
	return Configuration{
		provider: ProviderAWS,
		aws: &AWSConfiguration{
			accessKeyId:     accessKeyId,
			secretAccessKey: secretAccessKey,
		},
	}
}

func NewAzureConfiguration(subscriptionId, tenantId, clientId, clientSecret *string) Configuration {
	return Configuration{
		provider: ProviderAzure,
		azure: &AzureConfiguration{
			subscriptionId: subscriptionId,
			tenantId:       tenantId,
			clientId:       clientId,
			clientSecret:   clientSecret,
		},
	}
}

func NewGCPConfiguration(impersonateAccessToken *string) Configuration {
	return Configuration{
		provider: ProviderGCP,
		gcp: &GCPConfiguration{
			impersonateAccessToken: impersonateAccessToken,
		},
	}
}
