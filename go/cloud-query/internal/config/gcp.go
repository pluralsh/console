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

type GCPConfiguration struct {
	impersonateAccessToken *string
}

func (c *GCPConfiguration) ImpersonateAccessToken() string {
	if c != nil && c.impersonateAccessToken != nil && *c.impersonateAccessToken != "" {
		// Return the impersonate access token if it is set.
		return *c.impersonateAccessToken
	}

	return os.Getenv("GCP_IMPERSONATE_ACCESS_TOKEN")
}

func (c *GCPConfiguration) Query(connectionName string) (string, error) {
	tmpl, err := template.New("connection").Parse(`
		DROP SERVER IF EXISTS steampipe_{{ .ConnectionName }};
		CREATE SERVER steampipe_{{ .ConnectionName }} FOREIGN DATA WRAPPER steampipe_postgres_gcp OPTIONS (
			config '
				impersonate_access_token="{{ .ImpersonateAccessToken }}"
		');
		IMPORT FOREIGN SCHEMA "{{ .ConnectionName }}" FROM SERVER steampipe_{{ .ConnectionName }} INTO "{{ .ConnectionName }}";
    `)
	if err != nil {
		return "", fmt.Errorf("error parsing template: %w", err)
	}

	out := new(strings.Builder)
	err = tmpl.Execute(out, map[string]string{
		"DatabaseName":           "postgres",
		"ConnectionName":         connectionName,
		"ImpersonateAccessToken": c.ImpersonateAccessToken(),
	})
	if err != nil {
		return "", fmt.Errorf("error executing template: %w", err)
	}

	klog.V(log.LogLevelDebug).InfoS("generated AWS query", "query", out.String())
	return out.String(), nil
}

func (c *GCPConfiguration) MarshalJSON() ([]byte, error) {
	return json.Marshal(&struct {
		ImpersonateAccessToken *string `json:"impersonateAccessToken,omitempty"`
	}{
		ImpersonateAccessToken: c.impersonateAccessToken,
	})
}

func WithImpersonateAccessToken(impersonateAccessToken string) func(*GCPConfiguration) {
	return func(c *GCPConfiguration) {
		c.impersonateAccessToken = &impersonateAccessToken
	}
}
