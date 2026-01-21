package config_test

import (
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/pluralsh/console/go/nexus/internal/config"
)

const grpcEndpoint = "console:9090"

func TestValidate_ValidConfig(t *testing.T) {
	cfg := config.Defaults()
	cfg.Console.GRPCEndpoint = "console.example.com:9090"

	err := config.Validate(cfg)
	if err != nil {
		t.Errorf("expected valid config, got error: %v", err)
	}
}

func TestValidate_MissingConsoleEndpoint(t *testing.T) {
	cfg := config.Defaults()
	cfg.Console.GRPCEndpoint = ""

	err := config.Validate(cfg)
	if err == nil {
		t.Error("expected validation error for missing console endpoint")
	}

	var verr config.ValidationErrors
	ok := errors.As(err, &verr)
	if !ok {
		t.Fatalf("expected ValidationErrors, got %T", err)
	}

	found := false
	for _, e := range verr {
		if e.Field == "console.grpcEndpoint" {
			found = true
			if !strings.Contains(e.Message, "required") {
				t.Errorf("expected 'required' in error message, got: %s", e.Message)
			}
		}
	}
	if !found {
		t.Error("expected error for console.grpcEndpoint")
	}
}

func TestValidateServer_InvalidAddress(t *testing.T) {
	tests := []struct {
		name    string
		address string
		wantErr bool
	}{
		{"valid port only", ":8080", false},
		{"valid host and port", "localhost:8080", false},
		{"empty address", "", true},
		{"no port", "localhost", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cfg := config.Defaults()
			cfg.Console.GRPCEndpoint = grpcEndpoint
			cfg.Server.Address = tt.address

			err := config.Validate(cfg)
			hasError := err != nil

			if hasError != tt.wantErr {
				t.Errorf("Validate() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestValidateServer_NegativeTimeouts(t *testing.T) {
	cfg := config.Defaults()
	cfg.Console.GRPCEndpoint = grpcEndpoint
	cfg.Server.ReadTimeout = -1 * time.Second

	err := config.Validate(cfg)
	if err == nil {
		t.Error("expected error for negative timeout")
	}

	var verr config.ValidationErrors
	if !errors.As(err, &verr) {
		t.Fatalf("expected ValidationErrors, got %T", err)
	}

	found := false
	for _, e := range verr {
		if e.Field == "server.readTimeout" && strings.Contains(e.Message, "negative") {
			found = true
		}
	}
	if !found {
		t.Error("expected error for negative readTimeout")
	}
}

func TestValidateConsole_InvalidEndpoint(t *testing.T) {
	tests := []struct {
		name     string
		endpoint string
		wantErr  bool
	}{
		{"valid endpoint", "console.example.com:9090", false},
		{"valid with IP", "10.0.0.1:9090", false},
		{"empty endpoint", "", true},
		{"missing port", "console.example.com", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cfg := config.Defaults()
			cfg.Console.GRPCEndpoint = tt.endpoint

			err := config.Validate(cfg)
			hasError := err != nil

			if hasError != tt.wantErr {
				t.Errorf("Validate() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestValidateConsole_PollIntervalTooShort(t *testing.T) {
	cfg := config.Defaults()
	cfg.Console.GRPCEndpoint = grpcEndpoint
	cfg.Console.ConfigTTL = 5 * time.Second // Too short

	err := config.Validate(cfg)
	if err == nil {
		t.Error("expected error for poll interval too short")
	}

	var verr config.ValidationErrors
	if !errors.As(err, &verr) {
		t.Fatalf("expected ValidationErrors, got %T", err)
	}

	found := false
	for _, e := range verr {
		if e.Field == "console.configPollInterval" && strings.Contains(e.Message, "at least 10 seconds") {
			found = true
		}
	}
	if !found {
		t.Error("expected error about poll interval minimum")
	}
}

func TestValidateConsole_InvalidRetryConfig(t *testing.T) {
	cfg := config.Defaults()
	cfg.Console.GRPCEndpoint = grpcEndpoint
	cfg.Console.ConnectionRetry.MaxAttempts = 0 // Invalid

	err := config.Validate(cfg)
	if err == nil {
		t.Error("expected error for invalid maxAttempts")
	}

	var verr config.ValidationErrors
	if !errors.As(err, &verr) {
		t.Fatalf("expected ValidationErrors, got %T", err)
	}

	found := false
	for _, e := range verr {
		if e.Field == "console.connectionRetry.maxAttempts" {
			found = true
		}
	}
	if !found {
		t.Error("expected error for maxAttempts")
	}
}

func TestValidateConsole_MaxBackoffLessThanInitial(t *testing.T) {
	cfg := config.Defaults()
	cfg.Console.GRPCEndpoint = grpcEndpoint
	cfg.Console.ConnectionRetry.InitialBackoff = 30 * time.Second
	cfg.Console.ConnectionRetry.MaxBackoff = 10 * time.Second // Less than initial

	err := config.Validate(cfg)
	if err == nil {
		t.Error("expected error for maxBackoff < initialBackoff")
	}

	var verr config.ValidationErrors
	if !errors.As(err, &verr) {
		t.Fatalf("expected ValidationErrors, got %T", err)
	}

	found := false
	for _, e := range verr {
		if e.Field == "console.connectionRetry.maxBackoff" && strings.Contains(e.Message, ">=") {
			found = true
		}
	}
	if !found {
		t.Error("expected error about maxBackoff >= initialBackoff")
	}
}

func TestValidationErrors_Error(t *testing.T) {
	errs := config.ValidationErrors{
		config.ValidationError{Field: "field1", Message: "error1"},
		config.ValidationError{Field: "field2", Message: "error2"},
	}

	errStr := errs.Error()
	if !strings.Contains(errStr, "field1") {
		t.Error("error string should contain field1")
	}
	if !strings.Contains(errStr, "field2") {
		t.Error("error string should contain field2")
	}
	if !strings.Contains(errStr, "error1") {
		t.Error("error string should contain error1")
	}
	if !strings.Contains(errStr, "error2") {
		t.Error("error string should contain error2")
	}
}

func TestValidationError_Error(t *testing.T) {
	err := config.ValidationError{
		Field:   "test.field",
		Message: "test message",
	}

	errStr := err.Error()
	if !strings.Contains(errStr, "test.field") {
		t.Error("error string should contain field name")
	}
	if !strings.Contains(errStr, "test message") {
		t.Error("error string should contain message")
	}
}
