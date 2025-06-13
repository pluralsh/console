package server

import (
	"fmt"
	"time"
)

// Config holds the configuration for the gRPC server
type Config struct {
	// Address is the host:port combination the server will listen on
	Address string

	// MaxConnectionAge is the maximum duration a connection may exist before
	// it's gracefully terminated
	MaxConnectionAge time.Duration

	// MaxConnectionAgeGrace is the additional time beyond MaxConnectionAge
	// a connection may exist before it's forcibly closed
	MaxConnectionAgeGrace time.Duration

	// KeepAlive is the duration for which the server pings client if there is
	// no activity to ensure the connection is still alive
	KeepAlive time.Duration

	// KeepAliveTimeout is the duration the server waits for a response from the
	// client after sending a keep-alive ping
	KeepAliveTimeout time.Duration

	// TLS configuration options
	TLSCertPath string
	TLSKeyPath  string
}

// DefaultConfig returns a Config with sensible default values
func DefaultConfig() *Config {
	return &Config{
		Address:               ":9192",
		MaxConnectionAge:      2 * time.Hour,
		MaxConnectionAgeGrace: 5 * time.Minute,
		KeepAlive:             30 * time.Second,
		KeepAliveTimeout:      10 * time.Second,
	}
}

// Validate checks if the configuration is valid
func (c *Config) Validate() error {
	if c.Address == "" {
		return fmt.Errorf("server address cannot be empty")
	}

	// Additional validation as needed
	return nil
}
