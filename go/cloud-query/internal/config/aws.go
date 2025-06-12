package config

import (
	"fmt"
	"os"
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

func (c *AWSConfiguration) Query() string {
	return fmt.Sprintf(`
			SELECT steampipe_configure_aws('
				access_key=%q
				secret_key=%q
			');
		`, c.AccessKeyId(), c.SecretAccessKey())
}

func WithAWSAccessKeyId(accessKeyId string) func(*AWSConfiguration) {
	return func(c *AWSConfiguration) {
		c.accessKeyId = &accessKeyId
	}
}

func WithAWSSecretAccessKey(secretAccessKey string) func(*AWSConfiguration) {
	return func(c *AWSConfiguration) {
		c.secretAccessKey = &secretAccessKey
	}
}
