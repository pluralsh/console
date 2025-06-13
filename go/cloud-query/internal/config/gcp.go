package config

import (
	"encoding/json"
	"fmt"
	"os"
)

type GCPConfiguration struct {
	impersonateAccessToken *string
}

func (c *GCPConfiguration) ImpersonateAccessToken() string {
	if c != nil && c.impersonateAccessToken != nil && *c.impersonateAccessToken != "" {
		// Return the impersonate access token if it is set.
		return *c.impersonateAccessToken
	}

	return os.Getenv("GCP_IMPERSONATE_ACCESS_TOKEN")
}

func (c *GCPConfiguration) Query() string {
	return fmt.Sprintf(`
			SELECT steampipe_configure_gcp('
				impersonate_access_token=%q
			');
		`, c.ImpersonateAccessToken())
}

func (c *GCPConfiguration) MarshalJSON() ([]byte, error) {
	return json.Marshal(&struct {
		ImpersonateAccessToken *string `json:"impersonateAccessToken,omitempty"`
	}{
		ImpersonateAccessToken: c.impersonateAccessToken,
	})
}

func WithImpersonateAccessToken(impersonateAccessToken string) func(*GCPConfiguration) {
	return func(c *GCPConfiguration) {
		c.impersonateAccessToken = &impersonateAccessToken
	}
}
