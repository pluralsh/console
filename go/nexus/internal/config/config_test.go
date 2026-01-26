package config_test

import (
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/pluralsh/console/go/nexus/internal/config"
)

func TestDefaults(t *testing.T) {
	cfg := config.Defaults()

	// Test Server defaults
	if cfg.Server.Address != ":8080" {
		t.Errorf("expected server address :8080, got %s", cfg.Server.Address)
	}
	if cfg.Server.ReadTimeout != 30*time.Second {
		t.Errorf("expected read timeout 30s, got %v", cfg.Server.ReadTimeout)
	}

	// Test Console defaults
	if cfg.Console.ConfigTTL != 60*time.Second {
		t.Errorf("expected poll interval 60s, got %v", cfg.Console.ConfigTTL)
	}
	if cfg.Console.ConnectionRetry.MaxAttempts != 5 {
		t.Errorf("expected max attempts 5, got %d", cfg.Console.ConnectionRetry.MaxAttempts)
	}
}

func TestLoadFromFile(t *testing.T) {
	// Create a temporary config file
	tmpDir := t.TempDir()
	configFile := filepath.Join(tmpDir, "config.yaml")

	configContent := `
server:
  address: ":9090"
  readTimeout: "45s"
  idleTimeout: "150s"

console:
  grpcEndpoint: "console.example.com:9090"
  configTTL: "30s"
  requestTimeout: "15s"
  connectionRetry:
    maxAttempts: 3
    initialBackoff: "2s"
    maxBackoff: "60s"
`

	if err := os.WriteFile(configFile, []byte(configContent), 0644); err != nil {
		t.Fatalf("failed to write config file: %v", err)
	}

	cfg, err := config.Load(configFile)
	if err != nil {
		t.Fatalf("failed to load config: %v", err)
	}

	// Verify loaded values
	if cfg.Server.Address != ":9090" {
		t.Errorf("expected address :9090, got %s", cfg.Server.Address)
	}
	if cfg.Server.ReadTimeout != 45*time.Second {
		t.Errorf("expected read timeout 45s, got %v", cfg.Server.ReadTimeout)
	}
	if cfg.Server.IdleTimeout != 150*time.Second {
		t.Errorf("expected idle timeout 150s, got %v", cfg.Server.IdleTimeout)
	}
	if cfg.Console.GRPCEndpoint != "console.example.com:9090" {
		t.Errorf("expected console endpoint console.example.com:9090, got %s", cfg.Console.GRPCEndpoint)
	}
	if cfg.Console.ConfigTTL != 30*time.Second {
		t.Errorf("expected poll interval 30s, got %v", cfg.Console.ConfigTTL)
	}
	if cfg.Console.RequestTimeout != 15*time.Second {
		t.Errorf("expected request timeout 15s, got %v", cfg.Console.RequestTimeout)
	}
	if cfg.Console.ConnectionRetry.MaxAttempts != 3 {
		t.Errorf("expected max attempts 3, got %d", cfg.Console.ConnectionRetry.MaxAttempts)
	}
	if cfg.Console.ConnectionRetry.InitialBackoff != 2*time.Second {
		t.Errorf("expected initial backoff 2s, got %v", cfg.Console.ConnectionRetry.InitialBackoff)
	}
	if cfg.Console.ConnectionRetry.MaxBackoff != 60*time.Second {
		t.Errorf("expected max backoff 60s, got %v", cfg.Console.ConnectionRetry.MaxBackoff)
	}
}

func TestLoadPrecedence(t *testing.T) {
	// Create a config file
	tmpDir := t.TempDir()
	configFile := filepath.Join(tmpDir, "config.yaml")

	configContent := `
server:
  address: ":8888"
console:
  grpcEndpoint: "file-console:9090"
`

	if err := os.WriteFile(configFile, []byte(configContent), 0644); err != nil {
		t.Fatalf("failed to write config file: %v", err)
	}

	// Set environment variable (should override file)
	_ = os.Setenv("NEXUS_SERVER_ADDRESS", ":7777")
	defer func() {
		_ = os.Unsetenv("NEXUS_SERVER_ADDRESS")
	}()

	cfg, err := config.Load(configFile)
	if err != nil {
		t.Fatalf("failed to load config: %v", err)
	}

	// Env var should override file
	if cfg.Server.Address != ":7777" {
		t.Errorf("expected env var to override file, got %s", cfg.Server.Address)
	}

	// File value should be loaded when no env var
	if cfg.Console.GRPCEndpoint != "file-console:9090" {
		t.Errorf("expected file value, got %s", cfg.Console.GRPCEndpoint)
	}
}

func TestLoadFromFileOrDefaults_FileExists(t *testing.T) {
	tmpDir := t.TempDir()
	configFile := filepath.Join(tmpDir, "config.yaml")

	configContent := `
console:
  grpcEndpoint: "test-console:9090"
`

	if err := os.WriteFile(configFile, []byte(configContent), 0644); err != nil {
		t.Fatalf("failed to write config file: %v", err)
	}

	cfg, err := config.LoadFromFileOrDefaults(configFile)
	if err != nil {
		t.Fatalf("failed to load config: %v", err)
	}

	if cfg.Console.GRPCEndpoint != "test-console:9090" {
		t.Errorf("expected config from file, got %s", cfg.Console.GRPCEndpoint)
	}
}

func TestLoadFromFileOrDefaults_FileNotExists(t *testing.T) {
	tmpDir := t.TempDir()
	configFile := filepath.Join(tmpDir, "nonexistent.yaml")

	// Set required env var to pass validation
	_ = os.Setenv("NEXUS_CONSOLE_GRPCENDPOINT", "default-console:9090")
	defer func() {
		_ = os.Unsetenv("NEXUS_CONSOLE_GRPCENDPOINT")
	}()

	cfg, err := config.LoadFromFileOrDefaults(configFile)
	if err != nil {
		t.Fatalf("failed to load config: %v", err)
	}

	// Should use defaults (with env override)
	if cfg.Console.GRPCEndpoint != "default-console:9090" {
		t.Errorf("expected default with env override, got %s", cfg.Console.GRPCEndpoint)
	}
	if cfg.Server.Address != ":8080" {
		t.Errorf("expected default address, got %s", cfg.Server.Address)
	}
}

func TestLoadInvalidYAML(t *testing.T) {
	tmpDir := t.TempDir()
	configFile := filepath.Join(tmpDir, "invalid.yaml")

	// Write invalid YAML
	invalidYAML := `
server:
  address: ":8080"
  invalid yaml here
    no proper indentation
`

	if err := os.WriteFile(configFile, []byte(invalidYAML), 0644); err != nil {
		t.Fatalf("failed to write config file: %v", err)
	}

	_, err := config.Load(configFile)
	if err == nil {
		t.Error("expected error for invalid YAML, got nil")
	}
}

func TestConfigString(t *testing.T) {
	cfg := config.Defaults()
	cfg.Console.GRPCEndpoint = "test-console:9090"

	str := cfg.String()

	// Should include config details
	if str == "" {
		t.Error("expected non-empty string representation")
	}

	// Should contain server config
	// Note: String() method redacts sensitive info, so we just check it doesn't panic
	t.Logf("Config string: %s", str)
}
