package config

import (
	"fmt"
	"time"
)

// Config represents the complete Nexus configuration
type Config struct {
	Server        ServerConfig        `json:"server"`
	Console       ConsoleConfig       `json:"console"`
	Observability ObservabilityConfig `json:"observability"`
}

// ServerConfig contains HTTP server settings
type ServerConfig struct {
	// Address is the bind address for the HTTP server (e.g., ":8080")
	Address string `json:"address"`

	// Path is the base path for the HTTP server (e.g., "/ai/proxy")
	Path string `json:"path"`

	// ReadTimeout is the maximum duration for reading the entire request
	ReadTimeout time.Duration `json:"readTimeout"`

	// IdleTimeout is the maximum amount of time to wait for the next request
	IdleTimeout time.Duration `json:"idleTimeout"`
}

// ConsoleConfig contains Console gRPC client settings
type ConsoleConfig struct {
	// GRPCEndpoint is the Console gRPC endpoint (required)
	GRPCEndpoint string `json:"grpcEndpoint"`

	// ConfigTTL is the duration to cache Console configuration
	ConfigTTL time.Duration `json:"configTTL"`

	// ConnectionRetry contains client connection retry backoff settings
	ConnectionRetry ConnectionRetryConfig `json:"connectionRetry"`

	// RequestTimeout for Console gRPC calls
	RequestTimeout time.Duration `json:"requestTimeout"`
}

// ConnectionRetryConfig contains retry backoff settings
type ConnectionRetryConfig struct {
	MaxAttempts    int           `json:"maxAttempts"`
	InitialBackoff time.Duration `json:"initialBackoff"`
	MaxBackoff     time.Duration `json:"maxBackoff"`
}

// ObservabilityConfig contains logging settings
type ObservabilityConfig struct {
	LogLevel string `json:"logLevel"`
}

// Defaults returns a Config with default values
func Defaults() *Config {
	return &Config{
		Server: ServerConfig{
			Address:     ":8080",
			ReadTimeout: 30 * time.Second,
			IdleTimeout: 120 * time.Second,
		},
		Console: ConsoleConfig{
			GRPCEndpoint:   "localhost:50051",
			ConfigTTL:      60 * time.Second,
			RequestTimeout: 10 * time.Second,
			ConnectionRetry: ConnectionRetryConfig{
				MaxAttempts:    5,
				InitialBackoff: 1 * time.Second,
				MaxBackoff:     30 * time.Second,
			},
		},
	}
}

// String returns a string representation of the config (with sensitive data redacted)
func (c *Config) String() string {
	return fmt.Sprintf("Config{Server: %+v, Console: %s, Observability: %+v}",
		c.Server,
		redactConsoleConfig(c.Console),
		c.Observability,
	)
}

func redactConsoleConfig(c ConsoleConfig) string {
	return fmt.Sprintf("ConsoleConfig{GRPCEndpoint: %s, ConfigTTL: %s}",
		c.GRPCEndpoint,
		c.ConfigTTL,
	)
}
