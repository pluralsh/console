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

type GCPConfiguration struct {
	serviceAccountJSON *string
}

func (c *GCPConfiguration) Query(connectionName string) (string, error) {
	if c == nil {
		return "", fmt.Errorf("gcp configuration is nil")
	}

	tmpl, err := template.New("connection").Parse(`
		DROP SERVER IF EXISTS steampipe_{{ .ConnectionName }};
		CREATE SERVER steampipe_{{ .ConnectionName }} FOREIGN DATA WRAPPER steampipe_postgres_gcp OPTIONS (
			config '
				credentials="{{ .Credentials }}"
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
		"Credentials":    lo.FromPtr(c.serviceAccountJSON),
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
		ImpersonateAccessToken: c.serviceAccountJSON,
	})
}

func WithGCPServiceAccountJSON(impersonateAccessToken string) func(configuration *Configuration) {
	return func(c *Configuration) {
		c.gcp.serviceAccountJSON = &impersonateAccessToken
	}
}
