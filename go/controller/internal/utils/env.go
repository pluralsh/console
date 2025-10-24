package utils

import (
	"fmt"
	"os"
)

const (
	EnvPrefix = "PLRL"
)

// GetEnv - Lookup the environment variable provided and set to default value if variable isn't set.
func GetEnv(key, fallback string) string {
	if value := os.Getenv(key); len(value) > 0 {
		return value
	}

	return fallback
}

// GetPluralEnv - Lookup the plural environment variable.
// It has to be prefixed with EnvPrefix.
// If the variable with the provided key is not set, fallback will be used.
func GetPluralEnv(key, fallback string) string {
	return GetEnv(fmt.Sprintf("%s_%s", EnvPrefix, key), fallback)
}

// GetPluralEnvBool - Lookup the plural environment variable.
// It has to be prefixed with EnvPrefix.
// If the variable with the provided key is not set, fallback will be used.
func GetPluralEnvBool(key string, fallback bool) bool {
	switch GetEnv(fmt.Sprintf("%s_%s", EnvPrefix, key), "") {
	case "true":
		return true
	case "false":
		return false
	default:
		return fallback
	}
}
