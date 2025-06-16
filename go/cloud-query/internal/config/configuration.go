package config

import (
	"encoding/json"
	"fmt"

	"github.com/pluralsh/console/go/cloud-query/internal/common"
)

type Configuration struct {
	provider Provider
	aws      *AWSConfiguration
	azure    *AzureConfiguration
	gcp      *GCPConfiguration
}

func (c *Configuration) MarshalJSON() ([]byte, error) {
	var credentials []byte
	var err error
	switch c.provider {
	case ProviderAWS:
		credentials, err = c.aws.MarshalJSON()
	case ProviderAzure:
		credentials, err = c.azure.MarshalJSON()
	case ProviderGCP:
		credentials, err = c.gcp.MarshalJSON()
	}

	if err != nil {
		return nil, fmt.Errorf("failed to marshal provider %s configuration: %w", c.provider, err)

	}

	parentMap := map[string]any{
		"provider":    c.provider,
		"credentials": string(credentials),
	}

	return json.Marshal(parentMap)
}

type Option func(*Configuration)

func (c *Configuration) Provider() Provider {
	return c.provider
}

func (c *Configuration) Query(connectionName string) (string, error) {
	switch c.provider {
	case ProviderAWS:
		if c.aws == nil {
			return "", fmt.Errorf("configuration not set: %s", c.provider)
		}
		return c.aws.Query(connectionName)
	case ProviderAzure:
		if c.azure == nil {
			return "", fmt.Errorf("configuration not set: %s", c.provider)
		}
		return c.azure.Query(), nil
	case ProviderGCP:
		if c.gcp == nil {
			return "", fmt.Errorf("configuration not set: %s", c.provider)
		}
		return c.gcp.Query(), nil
	default:
		return "", fmt.Errorf("unsupported provider: %s", c.provider)
	}
}

func (c *Configuration) SHA() (string, error) {
	return common.HashObject(c)
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
