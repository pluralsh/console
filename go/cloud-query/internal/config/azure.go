package config

import (
	"encoding/json"
	"fmt"

	"github.com/samber/lo"
)

type AzureConfiguration struct {
	subscriptionId *string
	tenantId       *string
	clientId       *string
	clientSecret   *string
}

func (c *AzureConfiguration) Query(connectionName string) (string, []string, error) {
	if c == nil {
		return "", nil, fmt.Errorf("azure configuration is nil")
	}

	return `
		DROP SERVER IF EXISTS steampipe_$1;
		CREATE SERVER steampipe_$1 FOREIGN DATA WRAPPER steampipe_postgres_azure OPTIONS (
			config '
				subscription_id="$2"
				tenant_id="$3"
				client_id="$4"
				client_secret="$5"
		');
		IMPORT FOREIGN SCHEMA "$1" FROM SERVER steampipe_$1 INTO "$1";`, []string{
			connectionName,
			lo.FromPtr(c.subscriptionId),
			lo.FromPtr(c.tenantId),
			lo.FromPtr(c.clientId),
			lo.FromPtr(c.clientSecret),
		}, nil

}

func (c *AzureConfiguration) MarshalJSON() ([]byte, error) {
	return json.Marshal(&struct {
		SubscriptionId *string `json:"subscriptionId,omitempty"`
		TenantId       *string `json:"tenantId,omitempty"`
		ClientId       *string `json:"clientId,omitempty"`
		ClientSecret   *string `json:"clientSecret,omitempty"`
	}{
		SubscriptionId: c.subscriptionId,
		TenantId:       c.tenantId,
		ClientId:       c.clientId,
		ClientSecret:   c.clientSecret,
	})
}

func WithAzureSubscriptionId(subscriptionId string) func(*Configuration) {
	return func(c *Configuration) {
		c.azure.subscriptionId = &subscriptionId
	}
}

func WithAzureTenantId(tenantId string) func(*Configuration) {
	return func(c *Configuration) {
		c.azure.tenantId = &tenantId
	}
}

func WithAzureClientId(clientId string) func(*Configuration) {
	return func(c *Configuration) {
		c.azure.clientId = &clientId
	}
}

func WithAzureClientSecret(clientSecret string) func(*Configuration) {
	return func(c *Configuration) {
		c.azure.clientSecret = &clientSecret
	}
}
