package exa

import (
	"encoding/json"
	"strings"

	console "github.com/pluralsh/console/go/client"
)

type ConnectionConfig struct {
	URL      string `json:"url,omitempty"`
	ApiKey   string `json:"apiKey,omitempty"`
	ProxyURL string `json:"proxyUrl,omitempty"`
}

func ResolveConnection(raw string, scmCreds *console.ScmCredentialFragment) (Connection, bool) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return Connection{}, false
	}

	config := ConnectionConfig{}
	_ = json.Unmarshal([]byte(raw), &config)

	conn := Connection{
		URL:      config.URL,
		ProxyURL: config.ProxyURL,
	}
	if config.ApiKey != "" {
		conn.ApiKey = config.ApiKey
	} else if scmCreds != nil && scmCreds.ExaKey != nil && *scmCreds.ExaKey != "" {
		conn.ApiKey = *scmCreds.ExaKey
	}

	return conn, true
}
