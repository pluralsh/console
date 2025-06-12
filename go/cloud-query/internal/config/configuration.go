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

type Option func(*Configuration)

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

func NewAWSConfiguration(options ...Option) Configuration {
	c := Configuration{
		provider: ProviderAWS,
		aws:      &AWSConfiguration{},
	}

	for _, opt := range options {
		opt(&c)
	}

	return c
}

func NewAzureConfiguration(options ...Option) Configuration {
	c := Configuration{
		provider: ProviderAzure,
		azure:    &AzureConfiguration{},
	}

	for _, opt := range options {
		opt(&c)
	}

	return c
}

func NewGCPConfiguration(options ...Option) Configuration {
	c := Configuration{
		provider: ProviderGCP,
		gcp:      &GCPConfiguration{},
	}

	for _, opt := range options {
		opt(&c)
	}

	return c
}
