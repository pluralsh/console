package config

import (
	"fmt"
	"strings"
	"time"
)

// ValidationError represents a configuration validation error
type ValidationError struct {
	Field   string
	Message string
}

func (e ValidationError) Error() string {
	return fmt.Sprintf("invalid config field '%s': %s", e.Field, e.Message)
}

// ValidationErrors represents multiple validation errors
type ValidationErrors []ValidationError

func (e ValidationErrors) Error() string {
	if len(e) == 0 {
		return "no validation errors"
	}

	var sb strings.Builder
	sb.WriteString("configuration validation failed:\n")
	for _, err := range e {
		sb.WriteString(fmt.Sprintf("  - %s\n", err.Error()))
	}
	return sb.String()
}

// Validate validates the configuration
func Validate(cfg *Config) error {
	var errors ValidationErrors

	// Validate Server config
	if err := validateServer(&cfg.Server); err != nil {
		errors = append(errors, err...)
	}

	// Validate Console config
	if err := validateConsole(&cfg.Console); err != nil {
		errors = append(errors, err...)
	}

	if len(errors) > 0 {
		return errors
	}

	return nil
}

func validateServer(cfg *ServerConfig) ValidationErrors {
	var errors ValidationErrors

	// Validate address
	if cfg.Address == "" {
		errors = append(errors, ValidationError{
			Field:   "server.address",
			Message: "address is required",
		})
	} else if !strings.HasPrefix(cfg.Address, ":") && !strings.Contains(cfg.Address, ":") {
		errors = append(errors, ValidationError{
			Field:   "server.address",
			Message: "address must be in format ':port' or 'host:port'",
		})
	}

	// Validate timeouts
	if cfg.ReadTimeout < 0 {
		errors = append(errors, ValidationError{
			Field:   "server.readTimeout",
			Message: "readTimeout cannot be negative",
		})
	}
	if cfg.IdleTimeout < 0 {
		errors = append(errors, ValidationError{
			Field:   "server.idleTimeout",
			Message: "idleTimeout cannot be negative",
		})
	}

	return errors
}

func validateConsole(cfg *ConsoleConfig) ValidationErrors {
	var errors ValidationErrors

	// Validate gRPC endpoint (required)
	if cfg.GRPCEndpoint == "" {
		errors = append(errors, ValidationError{
			Field:   "console.grpcEndpoint",
			Message: "grpcEndpoint is required",
		})
	} else {
		// Validate endpoint format (should be host:port)
		if !strings.Contains(cfg.GRPCEndpoint, ":") {
			errors = append(errors, ValidationError{
				Field:   "console.grpcEndpoint",
				Message: "grpcEndpoint must be in format 'host:port'",
			})
		}
	}

	// Validate poll interval
	if cfg.ConfigTTL <= 0 {
		errors = append(errors, ValidationError{
			Field:   "console.configPollInterval",
			Message: "configPollInterval must be positive",
		})
	} else if cfg.ConfigTTL < 10*time.Second {
		errors = append(errors, ValidationError{
			Field:   "console.configPollInterval",
			Message: "configPollInterval should be at least 10 seconds to avoid excessive polling",
		})
	}

	// Validate request timeout
	if cfg.RequestTimeout <= 0 {
		errors = append(errors, ValidationError{
			Field:   "console.requestTimeout",
			Message: "requestTimeout must be positive",
		})
	}

	// Validate retry config
	if cfg.ConnectionRetry.MaxAttempts < 1 {
		errors = append(errors, ValidationError{
			Field:   "console.connectionRetry.maxAttempts",
			Message: "maxAttempts must be at least 1",
		})
	}
	if cfg.ConnectionRetry.InitialBackoff <= 0 {
		errors = append(errors, ValidationError{
			Field:   "console.connectionRetry.initialBackoff",
			Message: "initialBackoff must be positive",
		})
	}
	if cfg.ConnectionRetry.MaxBackoff <= 0 {
		errors = append(errors, ValidationError{
			Field:   "console.connectionRetry.maxBackoff",
			Message: "maxBackoff must be positive",
		})
	}
	if cfg.ConnectionRetry.MaxBackoff < cfg.ConnectionRetry.InitialBackoff {
		errors = append(errors, ValidationError{
			Field:   "console.connectionRetry.maxBackoff",
			Message: "maxBackoff must be >= initialBackoff",
		})
	}

	return errors
}
