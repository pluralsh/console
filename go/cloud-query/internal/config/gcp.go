package config

import (
	"encoding/json"
	"fmt"

	"github.com/lib/pq"
	"github.com/samber/lo"
)

type GCPConfiguration struct {
	serviceAccountJSON *string
}

func (c *GCPConfiguration) Query(connectionName string) (string, error) {
	if c == nil {
		return "", fmt.Errorf("gcp configuration is nil")
	}

	q := fmt.Sprintf(`
		DROP SERVER IF EXISTS %[2]s;
		CREATE SERVER %[2]s FOREIGN DATA WRAPPER steampipe_postgres_gcp OPTIONS (
			config '
				credentials=%[3]q
		');
		IMPORT FOREIGN SCHEMA %[1]s FROM SERVER %[2]s INTO %[1]s;
	`,
		pq.QuoteIdentifier(connectionName),
		pq.QuoteIdentifier("steampipe_"+connectionName),
		lo.FromPtr(c.serviceAccountJSON),
	)

	fmt.Println(q)

	return q, nil
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
