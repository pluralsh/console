package config

import (
	"encoding/json"
	"fmt"
	"strings"
	"text/template"

	"github.com/samber/lo"
	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/cloud-query/cmd/args"
	"github.com/pluralsh/console/go/cloud-query/internal/log"
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
		"DatabaseName":   args.DatabaseName(),
		"ConnectionName": connectionName,
		"SubscriptionId": lo.FromPtr(c.subscriptionId),
		"TenantId":       lo.FromPtr(c.tenantId),
		"ClientId":       lo.FromPtr(c.clientId),
		"ClientSecret":   lo.FromPtr(c.clientSecret),
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
