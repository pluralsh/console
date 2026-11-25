// Package guest is DEVBOX_RUNNER_CONFIG: the part of a DevboxRunner's spec that the operator bakes into its
// ActorTemplate and devbox-daemon applies inside the sandbox during the golden boot. Everything else (allowlist,
// identities, idle policy) is enforced by the gateway and console, so changing it doesn't roll a new revision.
package guest

import (
	"encoding/json"
	"fmt"
	"os"
)

// EnvVar holds the JSON Config in every actor of the template.
const EnvVar = "DEVBOX_RUNNER_CONFIG"

type Config struct {
	Runner string `json:"runner"`
	// Repositories are cloned into the home first, then Mise installs its tools, then BootstrapScript runs.
	Repositories    []Repository `json:"repositories,omitempty"`
	BootstrapScript string       `json:"bootstrapScript,omitempty"`
	Mise            string       `json:"mise,omitempty"`
	Browser         bool         `json:"browser"`
	Agents          []Agent      `json:"agents"`
}

type Repository struct {
	URL         string `json:"url"`
	Branch      string `json:"branch,omitempty"`
	Description string `json:"description,omitempty"`
}

type Agent struct {
	// Type is a DevboxRunner agent type (claude, codex, ...).
	Type           string   `json:"type"`
	Default        bool     `json:"default"`
	AdapterVersion string   `json:"adapterVersion,omitempty"`
	Models         []string `json:"models,omitempty"`
	DefaultModel   string   `json:"defaultModel,omitempty"`
	ACPV2          bool     `json:"acpV2"`
}

// HasWork reports whether the golden boot clones, installs or runs anything.
func (c *Config) HasWork() bool {
	return c != nil && (len(c.Repositories) > 0 || c.Mise != "" || c.BootstrapScript != "")
}

// FromEnv reads the Config of the template the process runs in; nil outside a DevboxRunner's template.
func FromEnv() (*Config, error) {
	raw := os.Getenv(EnvVar)
	if raw == "" {
		return nil, nil
	}
	cfg := &Config{}
	if err := json.Unmarshal([]byte(raw), cfg); err != nil {
		return nil, fmt.Errorf("decoding %s: %w", EnvVar, err)
	}
	return cfg, nil
}
