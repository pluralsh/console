package v1alpha1

import (
	"testing"

	console "github.com/pluralsh/console/go/client"
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
	method := console.OpenAiMethodChat
	cfg := &CodexConfig{
		Model:  new("gpt-5.4"),
		Method: &method,
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
	if raw.Method == nil || *raw.Method != console.OpenAiMethodChat {
		t.Fatalf("method = %v, want %s", raw.Method, console.OpenAiMethodChat)
	}
}

func TestOpenCodeConfig_ToOpenCodeConfigRawOpenAICompatible(t *testing.T) {
	method := console.OpenAiMethodChat
	cfg := &OpenCodeConfig{
		Method: &method,
		OpenAICompatible: &OpenCodeOpenAICompatibleConfig{
			Endpoint: "https://litellm.example/v1",
			Model:    new("gpt-4"),
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
	if raw.Method == nil || *raw.Method != console.OpenAiMethodChat {
		t.Fatalf("method = %v, want %s", raw.Method, console.OpenAiMethodChat)
	}
}

func TestOpenCodeConfig_ToOpenCodeConfigRawMethodWithAiProxy(t *testing.T) {
	method := console.OpenAiMethodChat
	cfg := &OpenCodeConfig{
		Provider: new("openai"),
		Model:    new("gpt-5.4"),
		Method:   &method,
	}

	raw, err := cfg.ToOpenCodeConfigRaw(func(corev1.SecretKeySelector) (*corev1.Secret, error) {
		t.Fatal("secret getter should not be called")
		return nil, nil
	}, true)
	if err != nil {
		t.Fatalf("ToOpenCodeConfigRaw() error = %v", err)
	}
	if raw.Provider == nil || *raw.Provider != "openai" {
		t.Fatalf("provider = %v, want openai", raw.Provider)
	}
	if raw.Model == nil || *raw.Model != "gpt-5.4" {
		t.Fatalf("model = %v, want parent gpt-5.4", raw.Model)
	}
	if raw.Method == nil || *raw.Method != console.OpenAiMethodChat {
		t.Fatalf("method = %v, want %s", raw.Method, console.OpenAiMethodChat)
	}
}

func TestPiConfig_ToPiConfigRawMethod(t *testing.T) {
	method := console.OpenAiMethodChat
	cfg := &PiConfig{
		Model:  new("gpt-5.4"),
		Method: &method,
	}

	raw, err := cfg.ToPiConfigRaw(func(corev1.SecretKeySelector) (*corev1.Secret, error) {
		t.Fatal("secret getter should not be called")
		return nil, nil
	})
	if err != nil {
		t.Fatalf("ToPiConfigRaw() error = %v", err)
	}
	if raw.Method == nil || *raw.Method != console.OpenAiMethodChat {
		t.Fatalf("method = %v, want %s", raw.Method, console.OpenAiMethodChat)
	}
}
