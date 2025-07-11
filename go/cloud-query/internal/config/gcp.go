package config

import (
	"encoding/json"
	"fmt"

	"github.com/lib/pq"
	"github.com/samber/lo"
)

type GCPConfiguration struct {
	serviceAccountJSON *string
	project            *string
}

func (c *GCPConfiguration) Query(connectionName string) (string, error) {
	if c == nil {
		return "", fmt.Errorf("gcp configuration is nil")
	}

	return fmt.Sprintf(`
		DROP SERVER IF EXISTS %[2]s;
		CREATE SERVER %[2]s FOREIGN DATA WRAPPER steampipe_postgres_gcp OPTIONS (
			config '
				credentials=%[3]q
				project=%[4]q
		');
		IMPORT FOREIGN SCHEMA %[1]s FROM SERVER %[2]s INTO %[1]s;
	`,
		pq.QuoteIdentifier(connectionName),
		pq.QuoteIdentifier("steampipe_"+connectionName),
		lo.FromPtr(c.serviceAccountJSON),
		lo.FromPtr(c.project),
	), nil
}

func (c *GCPConfiguration) MarshalJSON() ([]byte, error) {
	return json.Marshal(&struct {
		ServiceAccountJSON *string `json:"serviceAccountJSON,omitempty"`
		Project            *string `json:"project,omitempty"`
	}{
		ServiceAccountJSON: c.serviceAccountJSON,
		Project:            c.project,
	})
}

func WithGCPServiceAccountJSON(serviceAccountJSON string) func(configuration *Configuration) {
	return func(c *Configuration) {
		c.gcp.serviceAccountJSON = &serviceAccountJSON
	}
}

func WithGCPProject(project string) func(configuration *Configuration) {
	return func(c *Configuration) {
		c.gcp.project = &project
	}
}
