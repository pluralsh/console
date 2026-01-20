package config

import (
	"fmt"
	"os"
	"strings"

	"github.com/spf13/viper"
)

// Load loads configuration from file, environment variables, and flags
// Precedence: flags > environment variables > file > defaults
func Load(configFile string) (*Config, error) {
	// Start with defaults
	cfg := Defaults()

	// If config file provided, load it
	if configFile != "" {
		if err := loadFromFile(configFile, cfg); err != nil {
			return nil, fmt.Errorf("failed to load config file: %w", err)
		}
	}

	// Override with environment variables
	loadFromEnv(cfg)

	// Validate the final configuration
	if err := Validate(cfg); err != nil {
		return nil, fmt.Errorf("config validation failed: %w", err)
	}

	return cfg, nil
}

// loadFromFile loads configuration from a YAML or JSON file
func loadFromFile(configFile string, cfg *Config) error {
	v := viper.New()

	// Set config file
	v.SetConfigFile(configFile)

	// Read config file
	if err := v.ReadInConfig(); err != nil {
		// If file doesn't exist, that's okay - we'll use defaults
		if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
			return fmt.Errorf("error reading config file: %w", err)
		}
		return nil
	}

	// Unmarshal into config struct
	if err := v.Unmarshal(cfg); err != nil {
		return fmt.Errorf("error unmarshaling config: %w", err)
	}

	return nil
}

// loadFromEnv loads configuration from environment variables
// Environment variables use the format: NEXUS_SECTION_FIELD
// Example: NEXUS_SERVER_ADDRESS, NEXUS_CONSOLE_GRPCENDPOINT
func loadFromEnv(cfg *Config) {
	v := viper.New()

	// Set prefix for environment variables
	v.SetEnvPrefix("NEXUS")

	// Replace dots and hyphens with underscores for env var names
	v.SetEnvKeyReplacer(strings.NewReplacer(".", "_", "-", "_"))

	// Enable automatic environment variable binding
	v.AutomaticEnv()

	// Bind specific environment variables
	envBindings := map[string]*string{
		"server.address":         &cfg.Server.Address,
		"server.path":            &cfg.Server.Path,
		"console.grpcEndpoint":   &cfg.Console.GRPCEndpoint,
		"observability.logLevel": &cfg.Observability.LogLevel,
	}

	// Override string values from environment
	for key, target := range envBindings {
		if target != nil && v.IsSet(key) {
			*target = v.GetString(key)
		}
	}

	// Handle duration values
	if v.IsSet("console.configPollInterval") {
		cfg.Console.ConfigPollInterval = v.GetDuration("console.configPollInterval")
	}
	if v.IsSet("console.requestTimeout") {
		cfg.Console.RequestTimeout = v.GetDuration("console.requestTimeout")
	}
	if v.IsSet("console.connectionRetry.initialBackoff") {
		cfg.Console.ConnectionRetry.InitialBackoff = v.GetDuration("console.connectionRetry.initialBackoff")
	}
	if v.IsSet("console.connectionRetry.maxBackoff") {
		cfg.Console.ConnectionRetry.MaxBackoff = v.GetDuration("console.connectionRetry.maxBackoff")
	}
}

// LoadFromFileOrDefaults loads config from file if it exists, otherwise uses defaults
func LoadFromFileOrDefaults(configFile string) (*Config, error) {
	// Check if file exists
	if _, err := os.Stat(configFile); os.IsNotExist(err) {
		// File doesn't exist, use defaults
		cfg := Defaults()
		loadFromEnv(cfg)
		if err := Validate(cfg); err != nil {
			return nil, err
		}
		return cfg, nil
	}

	// File exists, load it
	return Load(configFile)
}
