package config

import (
	"encoding/json"
	"fmt"
	"strings"

	"github.com/lib/pq"
	"github.com/samber/lo"
)

type AWSConfiguration struct {
	accessKeyId     *string
	secretAccessKey *string
	regions         []string
	roleArn         *string
}

func (c *AWSConfiguration) Query(connectionName string) (string, error) {
	if c == nil {
		return "", fmt.Errorf("aws configuration is nil")
	}

	if len(lo.FromPtr(c.accessKeyId)) == 0 && len(lo.FromPtr(c.secretAccessKey)) == 0 {
		return c.podIdentityQuery(connectionName)
	}

	if len(lo.FromPtr(c.roleArn)) > 0 {
		return c.profileQuery(connectionName)
	}

	return c.credentialsQuery(connectionName)
}

func (c *AWSConfiguration) Cleanup(connectionName string) error {
	return GetAWSConfigManager().Remove(connectionName)
}

func (c *AWSConfiguration) podIdentityQuery(connectionName string) (string, error) {
	return fmt.Sprintf(`
			DROP SERVER IF EXISTS %[2]s;
			CREATE SERVER %[2]s FOREIGN DATA WRAPPER steampipe_postgres_aws OPTIONS (
				config '
					regions=[%[3]s]
			');
			IMPORT FOREIGN SCHEMA %[1]s FROM SERVER %[2]s INTO %[1]s;
		`,
		pq.QuoteIdentifier(connectionName),
		pq.QuoteIdentifier("steampipe_"+connectionName),
		c.getRegions(),
	), nil
}

func (c *AWSConfiguration) profileQuery(connectionName string) (string, error) {
	// sync aws config file
	if err := GetAWSConfigManager().Add(connectionName, AWSProfile{
		AccessKeyId:     lo.FromPtr(c.accessKeyId),
		SecretAccessKey: lo.FromPtr(c.secretAccessKey),
		RoleArn:         lo.FromPtr(c.roleArn),
	}); err != nil {
		return "", fmt.Errorf("failed to sync AWS config file: %w", err)
	}

	return fmt.Sprintf(`
			DROP SERVER IF EXISTS %[2]s;
			CREATE SERVER %[2]s FOREIGN DATA WRAPPER steampipe_postgres_aws OPTIONS (
				config '
					profile=%[3]s
					regions=[%[4]s]
			');
			IMPORT FOREIGN SCHEMA %[1]s FROM SERVER %[2]s INTO %[1]s;
		`,
		pq.QuoteIdentifier(connectionName),
		pq.QuoteIdentifier("steampipe_"+connectionName),
		pq.QuoteIdentifier(connectionName),
		c.getRegions(),
	), nil
}

func (c *AWSConfiguration) credentialsQuery(connectionName string) (string, error) {
	return fmt.Sprintf(`
		DROP SERVER IF EXISTS %[2]s;
		CREATE SERVER %[2]s FOREIGN DATA WRAPPER steampipe_postgres_aws OPTIONS (
			config '
				access_key=%[3]s
				secret_key=%[4]s
				regions=[%[5]s]
		');
		IMPORT FOREIGN SCHEMA %[1]s FROM SERVER %[2]s INTO %[1]s;
	`,
		pq.QuoteIdentifier(connectionName),
		pq.QuoteIdentifier("steampipe_"+connectionName),
		pq.QuoteIdentifier(lo.FromPtr(c.accessKeyId)),
		pq.QuoteIdentifier(lo.FromPtr(c.secretAccessKey)),
		c.getRegions(),
	), nil
}

func (c *AWSConfiguration) getRegions() string {
	filtered := lo.Filter(c.regions, func(item string, _ int) bool { return len(item) > 0 })
	quoted := make([]string, len(filtered))

	for i, item := range filtered {
		quoted[i] = pq.QuoteIdentifier(item)
	}

	return strings.Join(quoted, ", ")
}

func (c *AWSConfiguration) MarshalJSON() ([]byte, error) {
	return json.Marshal(&struct {
		AccessKeyId     *string  `json:"accessKeyId,omitempty"`
		SecretAccessKey *string  `json:"secretAccessKey,omitempty"`
		Regions         []string `json:"regions,omitempty"`
		RoleArn         *string  `json:"roleArn,omitempty"`
	}{
		AccessKeyId:     c.accessKeyId,
		SecretAccessKey: c.secretAccessKey,
		Regions:         c.regions,
		RoleArn:         c.roleArn,
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

func WithAWSRegions(regions ...string) func(*Configuration) {
	return func(c *Configuration) {
		if regions == nil {
			return
		}

		c.aws.regions = append(c.aws.regions, regions...)
	}
}

func WithAWSRoleArn(roleArn string) func(*Configuration) {
	return func(c *Configuration) {
		c.aws.roleArn = &roleArn
	}
}
