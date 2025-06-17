package config

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"text/template"

	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/cloud-query/internal/log"
)

type AWSConfiguration struct {
	accessKeyId     *string
	secretAccessKey *string
}

func (c *AWSConfiguration) AccessKeyId() string {
	if c != nil && c.accessKeyId != nil && *c.accessKeyId != "" {
		// Return the access key ID if it is set.
		return *c.accessKeyId
	}

	return os.Getenv("AWS_ACCESS_KEY_ID")
}

func (c *AWSConfiguration) SecretAccessKey() string {
	if c != nil && c.secretAccessKey != nil && *c.secretAccessKey != "" {
		// Return the access key ID if it is set.
		return *c.secretAccessKey
	}

	return os.Getenv("AWS_SECRET_ACCESS_KEY")
}

func (c *AWSConfiguration) Query(connectionName string) (string, error) {
	tmpl, err := template.New("connection").Parse(`
		DROP SERVER IF EXISTS steampipe_{{ .ConnectionName }};
		CREATE SERVER steampipe_{{ .ConnectionName }} FOREIGN DATA WRAPPER steampipe_postgres_aws OPTIONS (
			config '
				access_key="{{ .AccessKey }}"
				secret_key="{{ .SecretKey }}"
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
		"AccessKey":      c.AccessKeyId(),
		"SecretKey":      c.SecretAccessKey(),
	})
	if err != nil {
		return "", fmt.Errorf("error executing template: %w", err)
	}

	klog.V(log.LogLevelDebug).InfoS("generated AWS query", "query", out.String())
	return out.String(), nil
}

func (c *AWSConfiguration) MarshalJSON() ([]byte, error) {
	return json.Marshal(&struct {
		AccessKeyId     *string `json:"accessKeyId,omitempty"`
		SecretAccessKey *string `json:"secretAccessKey,omitempty"`
	}{
		AccessKeyId:     c.accessKeyId,
		SecretAccessKey: c.secretAccessKey,
	})
}

func WithAWSAccessKeyId(accessKeyId string) func(*Configuration) {
	return func(c *Configuration) {
		c.aws.accessKeyId = &accessKeyId
	}
}

func WithAWSSecretAccessKey(secretAccessKey string) func(*Configuration) {
	return func(c *Configuration) {
		c.aws.secretAccessKey = &secretAccessKey
	}
}
