package config

import (
	"encoding/json"
	"fmt"

	"github.com/samber/lo"
)

type GCPConfiguration struct {
	serviceAccountJSON *string
}

func (c *GCPConfiguration) Query(connectionName string) (string, []string, error) {
	if c == nil {
		return "", nil, fmt.Errorf("gcp configuration is nil")
	}

	return `
		DROP SERVER IF EXISTS steampipe_$1;
		CREATE SERVER steampipe_$1 FOREIGN DATA WRAPPER steampipe_postgres_gcp OPTIONS (
			config '
				credentials=$2
		');
		IMPORT FOREIGN SCHEMA "$1" FROM SERVER steampipe_$1 INTO "$1";
    `, []string{connectionName, lo.FromPtr(c.serviceAccountJSON)}, nil
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
