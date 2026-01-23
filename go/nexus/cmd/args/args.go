package args

import (
	"flag"
	"fmt"
	"os"

	"github.com/pluralsh/console/go/nexus/internal/config"
	"github.com/pluralsh/console/go/nexus/internal/log"
)

var (
	// Global flags
	argConfigFile = flag.String("config", "", "Path to configuration file (YAML/JSON)")
	argVersion    = flag.Bool("version", false, "Print version information and exit")

	// Server flags (override config file and env vars)
	argServerAddress = flag.String("server-address", "", "HTTP server bind address (e.g., ':8080')")
	argServerPath    = flag.String("server-path", "", "HTTP server base path (e.g., '/ai/proxy')")
	argReadTimeout   = flag.Duration("server-read-timeout", 0, "HTTP server read timeout duration (e.g., '15s')")
	argIdleTimeout   = flag.Duration("server-idle-timeout", 0, "HTTP server idle timeout duration (e.g., '60s')")

	// Console flags (override config file and env vars)
	argConsoleEndpoint       = flag.String("console-endpoint", "", "Console gRPC endpoint (e.g., 'localhost:50051')")
	argConsoleConfigTTL      = flag.Duration("console-config-ttl", 0, "Config time-to-live duration (e.g., '30s')")
	argConsoleRequestTimeout = flag.Duration("console-request-timeout", 0, "Request timeout (e.g., '10s')")

	// Observability flags (override config file and env vars)
	argLogLevel = flag.String("log-level", "", "Log level (debug, info, warn, error)")

	// Loaded configuration
	cfg *config.Config
)

// Init initializes the configuration system
// Precedence: CLI flags > environment variables > config file > defaults
func Init() error {
	flag.Parse()

	// Load config from file (or defaults if no file specified)
	var err error
	configFile := *argConfigFile
	if configFile != "" {
		cfg, err = config.Load(configFile)
	} else {
		// Try to load from default location if it exists
		cfg, err = config.LoadFromFileOrDefaults("config/config.yaml")
	}
	if err != nil {
		return fmt.Errorf("failed to load configuration: %w", err)
	}

	// Override with CLI flags if provided
	applyFlagOverrides()

	// Initialize logger with configured level
	if err := log.Init(cfg.Observability.LogLevel); err != nil {
		return fmt.Errorf("failed to initialize logger: %w", err)
	}

	return nil
}

// applyFlagOverrides applies CLI flag values over loaded config
func applyFlagOverrides() {
	// Server overrides
	if *argServerAddress != "" {
		cfg.Server.Address = *argServerAddress
	}
	if *argServerPath != "" {
		cfg.Server.Path = *argServerPath
	}
	if *argReadTimeout != 0 {
		cfg.Server.ReadTimeout = *argReadTimeout
	}
	if *argIdleTimeout != 0 {
		cfg.Server.IdleTimeout = *argIdleTimeout
	}

	// Console overrides
	if *argConsoleEndpoint != "" {
		cfg.Console.GRPCEndpoint = *argConsoleEndpoint
	}
	if *argConsoleConfigTTL != 0 {
		cfg.Console.ConfigTTL = *argConsoleConfigTTL
	}
	if *argConsoleRequestTimeout != 0 {
		cfg.Console.RequestTimeout = *argConsoleRequestTimeout
	}

	// Observability overrides
	if *argLogLevel != "" {
		cfg.Observability.LogLevel = *argLogLevel
	}
}

// Config returns the loaded configuration
func Config() *config.Config {
	if cfg == nil {
		// This should never happen if Init() was called
		_, _ = fmt.Fprintf(os.Stderr, "ERROR: Config() called before Init()\n")
		os.Exit(1)
	}
	return cfg
}

// Version returns whether version flag was set
func Version() bool {
	return *argVersion
}
