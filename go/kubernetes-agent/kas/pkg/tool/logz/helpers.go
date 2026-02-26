package logz

import (
	"fmt"
	"io"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

func LevelFromString(levelStr string) (zapcore.Level, error) {
	level, err := zapcore.ParseLevel(levelStr)
	if err != nil {
		return level, fmt.Errorf("log level: %w", err)
	}
	switch level { // nolint: exhaustive
	case zap.DebugLevel, zap.InfoLevel, zap.WarnLevel, zap.ErrorLevel:
	default:
		return level, fmt.Errorf("unsupported log level: %s", level)
	}
	return level, nil
}

func NewProductionEncoderConfig() zapcore.EncoderConfig {
	cfg := zap.NewProductionEncoderConfig()
	cfg.EncodeTime = zapcore.ISO8601TimeEncoder
	cfg.TimeKey = "time"
	return cfg
}

// NoSync can be used to wrap a io.Writer that implements zapcore.WriteSyncer but does not actually
// support the Sync() operation. An example is os.Stderr that returns
// "sync /dev/stderr: inappropriate ioctl for device" on sync attempt.
func NoSync(w io.Writer) zapcore.WriteSyncer {
	return noSync{
		Writer: w,
	}
}

type noSync struct {
	io.Writer
}

func (noSync) Sync() error {
	return nil
}
