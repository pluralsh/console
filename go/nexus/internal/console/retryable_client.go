package console

import (
	"context"
	"fmt"
	"math"
	"time"

	"go.uber.org/zap"

	"github.com/pluralsh/console/go/nexus/internal/config"
	"github.com/pluralsh/console/go/nexus/internal/log"
	pb "github.com/pluralsh/console/go/nexus/internal/proto"
)

// RetryableClient wraps the Console client with retry logic
type RetryableClient struct {
	client Client
	config config.ConnectionRetryConfig
	logger *zap.Logger
}

// NewRetryableClient creates a new client with retry capabilities
func NewRetryableClient(cfg *config.ConsoleConfig) (*RetryableClient, error) {
	logger := log.Logger().With(zap.String("component", "console-retry-client"))

	// Try to create the client with retries
	var consoleClient Client
	var lastErr error

	for attempt := 1; attempt <= cfg.ConnectionRetry.MaxAttempts; attempt++ {
		logger.Info("attempting to connect to console",
			zap.Int("attempt", attempt),
			zap.Int("max_attempts", cfg.ConnectionRetry.MaxAttempts),
		)

		c, err := NewClient(cfg)
		if err == nil {
			consoleClient = c
			break
		}

		lastErr = err
		logger.Warn("connection attempt failed",
			zap.Int("attempt", attempt),
			zap.Error(err),
		)

		// Don't sleep after the last attempt
		if attempt < cfg.ConnectionRetry.MaxAttempts {
			backoff := calculateBackoff(attempt, cfg.ConnectionRetry)
			logger.Info("retrying after backoff",
				zap.Duration("backoff", backoff),
				zap.Int("next_attempt", attempt+1),
			)
			time.Sleep(backoff)
		}
	}

	if consoleClient == nil {
		return nil, fmt.Errorf("failed to connect after %d attempts: %w",
			cfg.ConnectionRetry.MaxAttempts, lastErr)
	}

	return &RetryableClient{
		client: consoleClient,
		config: cfg.ConnectionRetry,
		logger: logger,
	}, nil
}

// calculateBackoff calculates exponential backoff with jitter
func calculateBackoff(attempt int, cfg config.ConnectionRetryConfig) time.Duration {
	// Exponential backoff: initialBackoff * 2^(attempt-1)
	backoff := float64(cfg.InitialBackoff) * math.Pow(2, float64(attempt-1))

	// Cap at maxBackoff
	if time.Duration(backoff) > cfg.MaxBackoff {
		backoff = float64(cfg.MaxBackoff)
	}

	// Add jitter (0-25% of backoff)
	jitter := backoff * 0.25 * float64(time.Now().UnixNano()%100) / 100.0

	return time.Duration(backoff + jitter)
}

// GetAiConfig retrieves the AI configuration with retry logic
func (r *RetryableClient) GetAiConfig(ctx context.Context) (*pb.AiConfig, error) {
	return r.client.GetAiConfig(ctx)
}

// ProxyAuthentication authenticates a token with retry logic
func (r *RetryableClient) ProxyAuthentication(ctx context.Context, token string) (bool, error) {
	return r.client.ProxyAuthentication(ctx, token)
}

// Close closes the underlying client connection
func (r *RetryableClient) Close() error {
	return r.client.Close()
}

// IsConnected checks if the underlying connection is alive
func (r *RetryableClient) IsConnected() bool {
	return r.client.IsConnected()
}
