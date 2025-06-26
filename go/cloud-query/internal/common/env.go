package common

import (
	"fmt"
	"os"
)

const (
	EnvPrefix = "PLRL"
)

// GetEnv - Lookup the environment variable provided and set to default value if variable isn't found
func GetEnv(key, fallback string) string {
	if value := os.Getenv(key); len(value) > 0 {
		return value
	}

	return fallback
}

// GetPluralEnv - Lookup the plural environment variable. It has to be prefixed with EnvPrefix. If variable
// with the provided key is not found, fallback will be used.
func GetPluralEnv(key, fallback string) string {
	return GetEnv(fmt.Sprintf("%s_%s", EnvPrefix, key), fallback)
}
