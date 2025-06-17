package config

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"text/template"

	"github.com/pluralsh/console/go/cloud-query/internal/log"
	"k8s.io/klog/v2"
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

func (c *AzureConfiguration) Query(connectionName string) (string, error) {
	tmpl, err := template.New("connection").Parse(`
		DROP SERVER IF EXISTS steampipe_{{ .ConnectionName }};
		CREATE SERVER steampipe_{{ .ConnectionName }} FOREIGN DATA WRAPPER steampipe_postgres_azure OPTIONS (
			config '
				subscription_id="{{ .SubscriptionId }}"
				tenant_id="{{ .TenantId }}"
				client_id="{{ .ClientId }}"
				client_secret="{{ .ClientSecret }}"
		');
		IMPORT FOREIGN SCHEMA "{{ .ConnectionName }}" FROM SERVER steampipe_{{ .ConnectionName }} INTO "{{ .ConnectionName }}";
    `)
	if err != nil {
		return "", fmt.Errorf("error parsing template: %w", err)
	}

	out := new(strings.Builder)
	err = tmpl.Execute(out, map[string]string{
		"DatabaseName":   "postgres",
		"ConnectionName": connectionName,
		"SubscriptionId": c.SubscriptionId(),
		"TenantId":       c.TenantId(),
		"ClientId":       c.ClientId(),
		"ClientSecret":   c.ClientSecret(),
	})
	if err != nil {
		return "", fmt.Errorf("error executing template: %w", err)
	}

	klog.V(log.LogLevelDebug).InfoS("generated AWS query", "query", out.String())
	return out.String(), nil
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

func WithSubscriptionId(subscriptionId string) func(*AzureConfiguration) {
	return func(c *AzureConfiguration) {
		c.subscriptionId = &subscriptionId
	}
}

func WithTenantId(tenantId string) func(*AzureConfiguration) {
	return func(c *AzureConfiguration) {
		c.tenantId = &tenantId
	}
}

func WithClientId(clientId string) func(*AzureConfiguration) {
	return func(c *AzureConfiguration) {
		c.clientId = &clientId
	}
}

func WithClientSecret(clientSecret string) func(*AzureConfiguration) {
	return func(c *AzureConfiguration) {
		c.clientSecret = &clientSecret
	}
}
