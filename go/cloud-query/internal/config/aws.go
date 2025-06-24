package config

import (
	"encoding/json"
	"fmt"

	"github.com/lib/pq"
	"github.com/samber/lo"
)

type AWSConfiguration struct {
	accessKeyId     *string
	secretAccessKey *string
}

func (c *AWSConfiguration) Query(connectionName string) (string, error) {
	if c == nil {
		return "", fmt.Errorf("aws configuration is nil")
	}

	return fmt.Sprintf(`
		DROP SERVER IF EXISTS %[2]s;
		CREATE SERVER %[2]s FOREIGN DATA WRAPPER steampipe_postgres_aws OPTIONS (
			config '
				access_key=%[3]s
				secret_key=%[4]s
		');
		IMPORT FOREIGN SCHEMA %[1]s FROM SERVER %[2]s INTO %[1]s;
	`,
		pq.QuoteIdentifier(connectionName),
		pq.QuoteIdentifier("steampipe_"+connectionName),
		pq.QuoteIdentifier(lo.FromPtr(c.accessKeyId)),
		pq.QuoteIdentifier(lo.FromPtr(c.secretAccessKey)),
	), nil
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
