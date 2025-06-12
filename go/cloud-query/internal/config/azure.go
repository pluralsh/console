package config

import (
	"fmt"
	"os"
)

type AzureConfiguration struct {
	subscriptionId *string
	tenantId       *string
	clientId       *string
	clientSecret   *string
}

func (c *AzureConfiguration) SubscriptionId() string {
	if c != nil && c.subscriptionId != nil && *c.subscriptionId != "" {
		// Return the subscription ID if it is set.
		return *c.subscriptionId
	}

	return os.Getenv("AZURE_SUBSCRIPTION_ID")
}

func (c *AzureConfiguration) TenantId() string {
	if c != nil && c.tenantId != nil && *c.tenantId != "" {
		// Return the tenant ID if it is set.
		return *c.tenantId
	}

	return os.Getenv("AZURE_TENANT_ID")
}

func (c *AzureConfiguration) ClientId() string {
	if c != nil && c.clientId != nil && *c.clientId != "" {
		// Return the client ID if it is set.
		return *c.clientId
	}

	return os.Getenv("AZURE_CLIENT_ID")
}

func (c *AzureConfiguration) ClientSecret() string {
	if c != nil && c.clientSecret != nil && *c.clientSecret != "" {
		// Return the client secret if it is set.
		return *c.clientSecret
	}

	return os.Getenv("AZURE_CLIENT_SECRET")
}

func (c *AzureConfiguration) Query() string {
	return fmt.Sprintf(`
			SELECT steampipe_configure_gcp('
				subscription_id=%q
				tenant_id=%q
				client_id=%q
				client_secret=%q
			');
		`, c.SubscriptionId(), c.TenantId(), c.ClientId(), c.ClientSecret())
}
