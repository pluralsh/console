package server

import (
	"fmt"
	"time"

	"github.com/pluralsh/console/go/cloud-query/cmd/args"
)

const (
	defaultMaxConnectionAge      = 2 * time.Hour
	defaultMaxConnectionAgeGrace = 5 * time.Minute
	defaultKeepAlive             = 30 * time.Second
	defaultKeepAliveTimeout      = 10 * time.Second
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

	// EnableReflection enables gRPC reflection for the server
	EnableReflection bool
}

// DefaultConfig returns a Config with sensible default values
func DefaultConfig() *Config {
	return &Config{
		Address:               args.ServerAddress(),
		MaxConnectionAge:      2 * time.Hour,
		MaxConnectionAgeGrace: 5 * time.Minute,
		KeepAlive:             30 * time.Second,
		KeepAliveTimeout:      10 * time.Second,
	}
}

// Sanitize validates the configuration and ensures all required fields are set
func (c *Config) Sanitize() error {
	if len(c.Address) == 0 {
		return fmt.Errorf("server address cannot be empty")
	}

	if c.MaxConnectionAge < 0 {
		c.MaxConnectionAge = defaultMaxConnectionAge
	}

	if c.MaxConnectionAgeGrace < 0 {
		c.MaxConnectionAgeGrace = defaultMaxConnectionAgeGrace
	}

	if c.KeepAlive < 0 {
		c.KeepAlive = defaultKeepAlive
	}

	if c.KeepAliveTimeout < 0 {
		c.KeepAliveTimeout = defaultKeepAliveTimeout
	}

	return nil
}
