package steampipe

import "os"

type Provider string

const (
	ProviderAWS Provider = "aws"
)

type Credentials struct {
	AWS *AWSCredentials
}

type AWSCredentials struct {
	accessKeyId     *string
	secretAccessKey *string
}

func (c *AWSCredentials) AccessKeyId() string {
	if c != nil && c.accessKeyId != nil && *c.accessKeyId != "" {
		// Return the access key ID if it is set.
		return *c.accessKeyId
	}

	return os.Getenv("AWS_ACCESS_KEY_ID")
}

func (c *AWSCredentials) SecretAccessKey() string {
	if c != nil && c.secretAccessKey != nil && *c.secretAccessKey != "" {
		// Return the access key ID if it is set.
		return *c.secretAccessKey
	}

	return os.Getenv("AWS_SECRET_ACCESS_KEY")
}

func NewAWSCredentials(accessKeyId, secretAccessKey *string) Credentials {
	return Credentials{
		AWS: &AWSCredentials{
			accessKeyId:     accessKeyId,
			secretAccessKey: secretAccessKey,
		},
	}
}
