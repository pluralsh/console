package log

import (
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

var (
	// logger is the global logger instance
	logger *zap.Logger
)

func Logger() *zap.Logger {
	return logger
}

// Init initializes the global logger with the specified level
func Init(level string) error {
	var zapLevel zapcore.Level
	if err := zapLevel.UnmarshalText([]byte(level)); err != nil {
		return err
	}

	config := zap.NewProductionConfig()
	config.Level = zap.NewAtomicLevelAt(zapLevel)
	config.EncoderConfig.TimeKey = "time"
	config.EncoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder
	config.DisableStacktrace = true

	l, err := config.Build()
	if err != nil {
		return err
	}

	logger = l
	return nil
}

// Sync flushes any buffered log entries
func Sync() {
	if logger != nil {
		_ = logger.Sync()
	}
}
