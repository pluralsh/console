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

	return c.buildQuery(connectionName)
}

func (c *AWSConfiguration) Cleanup(connectionName string) error {
	return GetAWSConfigManager().Remove(connectionName)
}

func (c *AWSConfiguration) buildQuery(connectionName string) (string, error) {
	serverName := pq.QuoteIdentifier("steampipe_" + connectionName)
	schemaName := pq.QuoteIdentifier(connectionName)

	query := strings.Builder{}
	query.WriteString(fmt.Sprintf("DROP SERVER IF EXISTS %s;\n", serverName))
	query.WriteString(fmt.Sprintf("CREATE SERVER %s FOREIGN DATA WRAPPER steampipe_postgres_aws OPTIONS (\n", serverName))
	query.WriteString("	config '\n")
	query.WriteString(fmt.Sprintf("		regions=[%s]\n", c.getRegions()))

	if c.hasRoleArn() {
		// sync aws config file
		if err := GetAWSConfigManager().Add(connectionName, AWSProfile{
			AccessKeyId:     lo.FromPtr(c.accessKeyId),
			SecretAccessKey: lo.FromPtr(c.secretAccessKey),
			RoleArn:         lo.FromPtr(c.roleArn),
		}); err != nil {
			return "", fmt.Errorf("failed to sync AWS config file: %w", err)
		}

		query.WriteString(fmt.Sprintf("		profile=%s\n", schemaName))
	} else if c.hasCredentials() {
		query.WriteString(fmt.Sprintf("		access_key=%s\n", pq.QuoteIdentifier(lo.FromPtr(c.accessKeyId))))
		query.WriteString(fmt.Sprintf("		secret_key=%s\n", pq.QuoteIdentifier(lo.FromPtr(c.secretAccessKey))))
	}

	query.WriteString("');\n")
	query.WriteString(fmt.Sprintf("IMPORT FOREIGN SCHEMA %[1]s FROM SERVER %[2]s INTO %[1]s;\n", schemaName, serverName))

	return query.String(), nil
}

func (c *AWSConfiguration) hasRoleArn() bool {
	return len(lo.FromPtr(c.roleArn)) > 0
}

func (c *AWSConfiguration) hasCredentials() bool {
	return len(lo.FromPtr(c.accessKeyId)) > 0 && len(lo.FromPtr(c.secretAccessKey)) > 0
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
