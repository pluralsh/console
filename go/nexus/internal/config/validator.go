package config

import (
	"fmt"
	"net/url"
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

	// Validate RateLimiting config
	if err := validateRateLimiting(&cfg.RateLimiting); err != nil {
		errors = append(errors, err...)
	}

	// Validate Observability config
	if err := validateObservability(&cfg.Observability); err != nil {
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
	if cfg.WriteTimeout < 0 {
		errors = append(errors, ValidationError{
			Field:   "server.writeTimeout",
			Message: "writeTimeout cannot be negative",
		})
	}
	if cfg.IdleTimeout < 0 {
		errors = append(errors, ValidationError{
			Field:   "server.idleTimeout",
			Message: "idleTimeout cannot be negative",
		})
	}
	if cfg.ShutdownTimeout < 0 {
		errors = append(errors, ValidationError{
			Field:   "server.shutdownTimeout",
			Message: "shutdownTimeout cannot be negative",
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
	if cfg.ConfigPollInterval <= 0 {
		errors = append(errors, ValidationError{
			Field:   "console.configPollInterval",
			Message: "configPollInterval must be positive",
		})
	} else if cfg.ConfigPollInterval < 10*time.Second {
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

func validateRateLimiting(cfg *RateLimitingConfig) ValidationErrors {
	var errors ValidationErrors

	// Validate backend
	if cfg.Enabled {
		// Validate per-user limits
		if cfg.PerUser.RequestsPerMinute < 0 {
			errors = append(errors, ValidationError{
				Field:   "rateLimiting.perUser.requestsPerMinute",
				Message: "requestsPerMinute cannot be negative",
			})
		}

		// Validate per-token limits
		if cfg.PerToken.RequestsPerMinute < 0 {
			errors = append(errors, ValidationError{
				Field:   "rateLimiting.perToken.requestsPerMinute",
				Message: "requestsPerMinute cannot be negative",
			})
		}
	}

	return errors
}

func validateObservability(cfg *ObservabilityConfig) ValidationErrors {
	var errors ValidationErrors

	// Validate log level
	validLogLevels := map[string]bool{
		"debug": true,
		"info":  true,
		"warn":  true,
		"error": true,
	}
	if !validLogLevels[cfg.LogLevel] {
		errors = append(errors, ValidationError{
			Field:   "observability.logLevel",
			Message: "logLevel must be one of: debug, info, warn, error",
		})
	}

	// Validate metrics path
	if cfg.Metrics.Enabled {
		if cfg.Metrics.Path == "" {
			errors = append(errors, ValidationError{
				Field:   "observability.metrics.path",
				Message: "path is required when metrics are enabled",
			})
		} else if !strings.HasPrefix(cfg.Metrics.Path, "/") {
			errors = append(errors, ValidationError{
				Field:   "observability.metrics.path",
				Message: "path must start with '/'",
			})
		}
	}

	// Validate tracing config
	if cfg.Tracing.Enabled {
		if cfg.Tracing.Service == "" {
			errors = append(errors, ValidationError{
				Field:   "observability.tracing.service",
				Message: "service name is required when tracing is enabled",
			})
		}
		if cfg.Tracing.DatadogAgentHost == "" {
			errors = append(errors, ValidationError{
				Field:   "observability.tracing.datadogAgentHost",
				Message: "datadogAgentHost is required when tracing is enabled",
			})
		}
	}

	return errors
}

// validateURL validates a URL string
func validateURL(urlStr string) error {
	if urlStr == "" {
		return fmt.Errorf("URL cannot be empty")
	}

	u, err := url.Parse(urlStr)
	if err != nil {
		return fmt.Errorf("invalid URL: %w", err)
	}

	if u.Scheme == "" {
		return fmt.Errorf("URL must have a scheme (http:// or https://)")
	}

	if u.Host == "" {
		return fmt.Errorf("URL must have a host")
	}

	return nil
}
