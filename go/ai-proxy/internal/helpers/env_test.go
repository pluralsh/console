package helpers

import (
	"os"
	"reflect"
	"testing"
)

func TestGetPluralEnvSlice(t *testing.T) {
	tests := []struct {
		name     string
		key      string
		envValue string
		fallback []string
		want     []string
	}{
		{
			name:     "empty env returns fallback",
			key:      "TEST_KEY",
			envValue: "",
			fallback: []string{},
			want:     []string{},
		},
		{
			name:     "single value returns single item slice",
			key:      "TEST_KEY",
			envValue: "value1",
			fallback: []string{},
			want:     []string{"value1"},
		},
		{
			name:     "multiple values returns split slice",
			key:      "TEST_KEY",
			envValue: "value1,value2,value3",
			fallback: []string{},
			want:     []string{"value1", "value2", "value3"},
		},
		{
			name:     "empty values in list are preserved",
			key:      "TEST_KEY",
			envValue: "value1,,value3",
			fallback: []string{},
			want:     []string{"value1", "", "value3"},
		},
		{
			name:     "spaces are preserved",
			key:      "TEST_KEY",
			envValue: "value1, value2 ,value3",
			fallback: []string{},
			want:     []string{"value1", " value2 ", "value3"},
		},
		{
			name:     "unset env returns fallback",
			key:      "TEST_KEY_UNSET",
			envValue: "", // not set
			fallback: []string{},
			want:     []string{},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Setup
			if tt.envValue != "" {
				if err := os.Setenv("PLRL_"+tt.key, tt.envValue); err != nil {
					t.Fatalf("failed to set environment variable: %v", err)
				}
				defer func() {
					if err := os.Unsetenv("PLRL_" + tt.key); err != nil {
						t.Errorf("failed to unset environment variable: %v", err)
					}
				}()
			}

			// Test
			got := GetPluralEnvSlice(tt.key, tt.fallback)

			// Assert
			if !reflect.DeepEqual(got, tt.want) {
				t.Errorf("GetPluralEnvSlice() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestGetPluralEnvBool(t *testing.T) {
	tests := []struct {
		name     string
		envValue string
		fallback bool
		want     bool
	}{
		{name: "unset environment returns fallback", fallback: true, want: true},
		{name: "true enables value", envValue: "true", want: true},
		{name: "false disables value", envValue: "false", fallback: true, want: false},
		{name: "invalid value returns fallback", envValue: "not-a-bool", fallback: true, want: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Setenv("PLRL_TEST_BOOL", tt.envValue)

			if got := GetPluralEnvBool("TEST_BOOL", tt.fallback); got != tt.want {
				t.Errorf("GetPluralEnvBool() = %t, want %t", got, tt.want)
			}
		})
	}
}
