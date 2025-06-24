package config

import (
	"encoding/json"
	"fmt"

	"github.com/samber/lo"
)

type AWSConfiguration struct {
	accessKeyId     *string
	secretAccessKey *string
}

func (c *AWSConfiguration) Query(connectionName string) (string, []string, error) {
	if c == nil {
		return "", nil, fmt.Errorf("aws configuration is nil")
	}

	return `
		DROP SERVER IF EXISTS steampipe_$1;
		CREATE SERVER steampipe_$1 FOREIGN DATA WRAPPER steampipe_postgres_aws OPTIONS (
			config '
				access_key="$2"
				secret_key="$3"
		');
		IMPORT FOREIGN SCHEMA "$1" FROM SERVER steampipe_$1 INTO "$1";
    `, []string{connectionName, lo.FromPtr(c.accessKeyId), lo.FromPtr(c.secretAccessKey)}, nil
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
