package config

import (
	"fmt"
	"time"
)

// Config represents the complete Nexus configuration
type Config struct {
	Server        ServerConfig        `json:"server"`
	Console       ConsoleConfig       `json:"console"`
	RateLimiting  RateLimitingConfig  `json:"rateLimiting"`
	Observability ObservabilityConfig `json:"observability"`
}

// ServerConfig contains HTTP server settings
type ServerConfig struct {
	// Address is the bind address for the HTTP server (e.g., ":8080")
	Address string `json:"address"`

	// ReadTimeout is the maximum duration for reading the entire request
	ReadTimeout time.Duration `json:"readTimeout"`

	// WriteTimeout is the maximum duration before timing out writes
	WriteTimeout time.Duration `json:"writeTimeout"`

	// IdleTimeout is the maximum amount of time to wait for the next request
	IdleTimeout time.Duration `json:"idleTimeout"`

	// ShutdownTimeout is the maximum duration to wait for graceful shutdown
	ShutdownTimeout time.Duration `json:"shutdownTimeout"`
}

// ConsoleConfig contains Console gRPC client settings
type ConsoleConfig struct {
	// GRPCEndpoint is the Console gRPC endpoint (required)
	GRPCEndpoint string `json:"grpcEndpoint"`

	// ConfigPollInterval is how often to poll Console for AI config updates
	ConfigPollInterval time.Duration `json:"configPollInterval"`

	// ConnectionRetry settings
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

// RateLimitingConfig contains rate limiting settings
type RateLimitingConfig struct {
	Enabled  bool              `json:"enabled"`
	PerUser  RateLimitSettings `json:"perUser"`
	PerToken RateLimitSettings `json:"perToken"`
}

// RateLimitSettings defines rate limit thresholds
type RateLimitSettings struct {
	RequestsPerMinute int `json:"requestsPerMinute"`
}

// ObservabilityConfig contains logging, metrics, and tracing settings
type ObservabilityConfig struct {
	LogLevel string        `json:"logLevel"`
	Metrics  MetricsConfig `json:"metrics"`
	Tracing  TracingConfig `json:"tracing"`
}

// MetricsConfig contains Prometheus metrics settings
type MetricsConfig struct {
	Enabled bool   `json:"enabled"`
	Path    string `json:"path"`
}

// TracingConfig contains Datadog tracing settings
type TracingConfig struct {
	Enabled          bool   `json:"enabled"`
	Service          string `json:"service"`
	DatadogAgentHost string `json:"datadogAgentHost"`
}

// Defaults returns a Config with default values
func Defaults() *Config {
	return &Config{
		Server: ServerConfig{
			Address:         ":8080",
			ReadTimeout:     30 * time.Second,
			WriteTimeout:    30 * time.Second,
			IdleTimeout:     120 * time.Second,
			ShutdownTimeout: 30 * time.Second,
		},
		Console: ConsoleConfig{
			GRPCEndpoint:       "",
			ConfigPollInterval: 60 * time.Second,
			RequestTimeout:     10 * time.Second,
			ConnectionRetry: ConnectionRetryConfig{
				MaxAttempts:    5,
				InitialBackoff: 1 * time.Second,
				MaxBackoff:     30 * time.Second,
			},
		},
		RateLimiting: RateLimitingConfig{
			Enabled: true,
			PerUser: RateLimitSettings{
				RequestsPerMinute: 60,
			},
			PerToken: RateLimitSettings{
				RequestsPerMinute: 100,
			},
		},
		Observability: ObservabilityConfig{
			LogLevel: "info",
			Metrics: MetricsConfig{
				Enabled: true,
				Path:    "/metrics",
			},
			Tracing: TracingConfig{
				Enabled:          false,
				Service:          "nexus",
				DatadogAgentHost: "localhost:8126",
			},
		},
	}
}

// String returns a string representation of the config (with sensitive data redacted)
func (c *Config) String() string {
	return fmt.Sprintf("Config{Server: %+v, Console: %s, RateLimiting: %+v, Observability: %+v}",
		c.Server,
		redactConsoleConfig(c.Console),
		c.RateLimiting,
		c.Observability,
	)
}

func redactConsoleConfig(c ConsoleConfig) string {
	return fmt.Sprintf("ConsoleConfig{GRPCEndpoint: %s, ConfigPollInterval: %s}",
		c.GRPCEndpoint,
		c.ConfigPollInterval,
	)
}
