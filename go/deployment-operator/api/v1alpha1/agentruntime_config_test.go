package v1alpha1

import (
	"testing"

	corev1 "k8s.io/api/core/v1"
)

func TestSecretKeySelectorSet(t *testing.T) {
	tests := []struct {
		name string
		ref  *corev1.SecretKeySelector
		want bool
	}{
		{name: "nil", ref: nil, want: false},
		{name: "empty", ref: &corev1.SecretKeySelector{}, want: false},
		{name: "name only", ref: &corev1.SecretKeySelector{LocalObjectReference: corev1.LocalObjectReference{Name: "secret"}}, want: false},
		{name: "complete", ref: &corev1.SecretKeySelector{LocalObjectReference: corev1.LocalObjectReference{Name: "secret"}, Key: "token"}, want: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := secretKeySelectorSet(tt.ref); got != tt.want {
				t.Fatalf("secretKeySelectorSet() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestCodexConfig_ToCodexConfigRawWithoutSecret(t *testing.T) {
	cfg := &CodexConfig{
		Model: strPtr("gpt-5.4"),
	}

	raw, err := cfg.ToCodexConfigRaw(func(corev1.SecretKeySelector) (*corev1.Secret, error) {
		t.Fatal("secret getter should not be called")
		return nil, nil
	})
	if err != nil {
		t.Fatalf("ToCodexConfigRaw() error = %v", err)
	}
	if raw.ApiKey != "" {
		t.Fatalf("expected empty api key, got %q", raw.ApiKey)
	}
}

func TestOpenCodeConfig_ToOpenCodeConfigRawOpenAICompatible(t *testing.T) {
	cfg := &OpenCodeConfig{
		OpenAICompatible: &OpenCodeOpenAICompatibleConfig{
			Endpoint: "https://litellm.example/v1",
			Model:    strPtr("gpt-4"),
			TokenSecretRef: &corev1.SecretKeySelector{
				LocalObjectReference: corev1.LocalObjectReference{Name: "litellm"},
				Key:                  "api-key",
			},
		},
	}

	raw, err := cfg.ToOpenCodeConfigRaw(func(ref corev1.SecretKeySelector) (*corev1.Secret, error) {
		return &corev1.Secret{Data: map[string][]byte{ref.Key: []byte("secret-token")}}, nil
	}, false)
	if err != nil {
		t.Fatalf("ToOpenCodeConfigRaw() error = %v", err)
	}
	if !raw.OpenAICompatible {
		t.Fatal("expected OpenAICompatible=true")
	}
	if raw.Provider == nil || *raw.Provider != openCodeOpenAICompatibleProvider {
		t.Fatalf("provider = %v, want %s", raw.Provider, openCodeOpenAICompatibleProvider)
	}
	if raw.Endpoint == nil || *raw.Endpoint != "https://litellm.example/v1" {
		t.Fatalf("endpoint = %v", raw.Endpoint)
	}
	if raw.Token != "secret-token" {
		t.Fatalf("token = %q, want secret-token", raw.Token)
	}
}

func TestOpenCodeConfig_ToOpenCodeConfigRawOpenAICompatibleIgnoredWithAiProxy(t *testing.T) {
	cfg := &OpenCodeConfig{
		Provider: strPtr("openai"),
		Model:    strPtr("gpt-5.4"),
		OpenAICompatible: &OpenCodeOpenAICompatibleConfig{
			Endpoint: "https://litellm.example/v1",
			Model:    strPtr("gpt-4"),
		},
	}

	raw, err := cfg.ToOpenCodeConfigRaw(func(corev1.SecretKeySelector) (*corev1.Secret, error) {
		t.Fatal("secret getter should not be called")
		return nil, nil
	}, true)
	if err != nil {
		t.Fatalf("ToOpenCodeConfigRaw() error = %v", err)
	}
	if raw.OpenAICompatible {
		t.Fatal("expected OpenAICompatible=false when aiProxy is enabled")
	}
	if raw.Provider == nil || *raw.Provider != "openai" {
		t.Fatalf("provider = %v, want openai", raw.Provider)
	}
	if raw.Endpoint != nil && *raw.Endpoint != "" {
		t.Fatalf("endpoint = %v, want unset", raw.Endpoint)
	}
}

func strPtr(s string) *string {
	return &s
}
