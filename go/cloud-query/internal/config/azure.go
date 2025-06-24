package config

import (
	"encoding/json"
	"fmt"

	"github.com/lib/pq"
	"github.com/samber/lo"
)

type AzureConfiguration struct {
	subscriptionId *string
	tenantId       *string
	clientId       *string
	clientSecret   *string
}

func (c *AzureConfiguration) Query(connectionName string) (string, error) {
	if c == nil {
		return "", fmt.Errorf("azure configuration is nil")
	}

	return fmt.Sprintf(`
		DROP SERVER IF EXISTS %[2]s;
		CREATE SERVER %[2]s FOREIGN DATA WRAPPER steampipe_postgres_azure OPTIONS (
			config '
				subscription_id=%[3]s
				tenant_id=%[4]s
				client_id=%[5]s
				client_secret=%[6]s
		');
		IMPORT FOREIGN SCHEMA %[1]s FROM SERVER %[2]s INTO %[1]s;
	`,
		pq.QuoteIdentifier(connectionName),
		pq.QuoteIdentifier("steampipe_"+connectionName),
		pq.QuoteIdentifier(lo.FromPtr(c.subscriptionId)),
		pq.QuoteIdentifier(lo.FromPtr(c.tenantId)),
		pq.QuoteIdentifier(lo.FromPtr(c.clientId)),
		pq.QuoteIdentifier(lo.FromPtr(c.clientSecret)),
	), nil
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
