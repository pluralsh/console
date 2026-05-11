package helpers

import (
	"os"
	"reflect"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestGetEnv(t *testing.T) {
	key := "TEST_ENV_VAR"
	fallback := "fallback"

	// Test case: environment variable not set
	os.Unsetenv(key)
	assert.Equal(t, fallback, GetEnv(key, fallback))

	// Test case: environment variable set
	expected := "value"
	os.Setenv(key, expected)
	defer os.Unsetenv(key)
	assert.Equal(t, expected, GetEnv(key, fallback))
}

func TestGetPluralEnv(t *testing.T) {
	key := "VAR"
	prefixedKey := "PLRL_VAR"
	fallback := "fallback"

	// Test case: environment variable not set
	os.Unsetenv(prefixedKey)
	assert.Equal(t, fallback, GetPluralEnv(key, fallback))

	// Test case: environment variable set (without prefix in key parameter)
	expected := "value"
	os.Setenv(prefixedKey, expected)
	defer os.Unsetenv(prefixedKey)
	assert.Equal(t, expected, GetPluralEnv(key, fallback))

	// Test case: environment variable set (with prefix in key parameter)
	assert.Equal(t, expected, GetPluralEnv(prefixedKey, fallback))
}

func TestGetPluralEnvBool(t *testing.T) {
	key := "BOOL_VAR"
	prefixedKey := "PLRL_BOOL_VAR"

	tests := []struct {
		name     string
		envValue string
		fallback bool
		expected bool
	}{
		{"not set, fallback true", "", true, true},
		{"not set, fallback false", "", false, false},
		{"set true, fallback false", "true", false, true},
		{"set TRUE, fallback false", "TRUE", false, true},
		{"set false, fallback true", "false", true, false},
		{"set other, fallback true", "other", true, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.envValue != "" {
				os.Setenv(prefixedKey, tt.envValue)
				defer os.Unsetenv(prefixedKey)
			} else {
				os.Unsetenv(prefixedKey)
			}
			assert.Equal(t, tt.expected, GetPluralEnvBool(key, tt.fallback))
		})
	}
}

func TestGetPluralEnvSlice(t *testing.T) {
	key := "SLICE_VAR"
	prefixedKey := "PLRL_SLICE_VAR"

	tests := []struct {
		name     string
		envValue string
		fallback []string
		expected []string
	}{
		{"not set, fallback", "", []string{"a", "b"}, []string{"a", "b"}},
		{"set single", "val1", []string{"a"}, []string{"val1"}},
		{"set multiple", "val1,val2,val3", []string{"a"}, []string{"val1", "val2", "val3"}},
		{"set with spaces", " val1 ,  val2,val3  ", []string{"a"}, []string{"val1", "val2", "val3"}},
		{"set empty string", "", []string{"a"}, []string{"a"}},
		{"set only commas", ",,,", []string{"a"}, []string{"a"}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.envValue != "" {
				os.Setenv(prefixedKey, tt.envValue)
				defer os.Unsetenv(prefixedKey)
			} else {
				os.Unsetenv(prefixedKey)
			}
			assert.True(t, reflect.DeepEqual(tt.expected, GetPluralEnvSlice(key, tt.fallback)))
		})
	}
}

func TestGetPluralEnvDuration(t *testing.T) {
	key := "DURATION_VAR"
	prefixedKey := "PLRL_DURATION_VAR"
	fallback := 5 * time.Minute

	tests := []struct {
		name     string
		envValue string
		expected time.Duration
	}{
		{"not set", "", fallback},
		{"valid duration", "10m", 10 * time.Minute},
		{"invalid duration", "invalid", fallback},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.envValue != "" {
				os.Setenv(prefixedKey, tt.envValue)
				defer os.Unsetenv(prefixedKey)
			} else {
				os.Unsetenv(prefixedKey)
			}
			assert.Equal(t, tt.expected, GetPluralEnvDuration(key, fallback))
		})
	}
}
