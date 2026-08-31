package controller

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/samber/lo"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/runtime/schema"

	"github.com/pluralsh/console/go/deployment-operator/api/v1alpha1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/mcp"
)

type fakeConfigurationFetcher struct {
	secrets    map[string]*corev1.Secret
	configMaps map[string]*corev1.ConfigMap
}

func (f *fakeConfigurationFetcher) GetSecret(_ context.Context, selector corev1.SecretKeySelector) (*corev1.Secret, error) {
	if secret, ok := f.secrets[selector.Name]; ok {
		return secret, nil
	}
	return nil, apierrors.NewNotFound(schema.GroupResource{Resource: "secrets"}, selector.Name)
}

func (f *fakeConfigurationFetcher) GetConfigMap(_ context.Context, selector corev1.ConfigMapKeySelector) (*corev1.ConfigMap, error) {
	if cm, ok := f.configMaps[selector.Name]; ok {
		return cm, nil
	}
	return nil, apierrors.NewNotFound(schema.GroupResource{Resource: "configmaps"}, selector.Name)
}

var _ ConfigurationFetcher = (*fakeConfigurationFetcher)(nil)

func TestResolveMCPServers_LiteralAndSecretAndConfigMap(t *testing.T) {
	servers := []v1alpha1.MCPServer{{
		Name:         "linear",
		URL:          "https://mcp.linear.app/mcp",
		AllowedTools: []string{"list_issues"},
		Headers: []v1alpha1.MCPServerHeader{{
			Name:  "Authorization",
			Value: lo.ToPtr("Bearer token"),
		}, {
			Name: "X-Api-Key",
			ValueFrom: &corev1.EnvVarSource{
				SecretKeyRef: &corev1.SecretKeySelector{
					LocalObjectReference: corev1.LocalObjectReference{Name: "linear"},
					Key:                  "api-key",
				},
			},
		}, {
			Name: "X-Org",
			ValueFrom: &corev1.EnvVarSource{
				ConfigMapKeyRef: &corev1.ConfigMapKeySelector{
					LocalObjectReference: corev1.LocalObjectReference{Name: "linear"},
					Key:                  "org",
				},
			},
		}},
	}}

	fetcher := &fakeConfigurationFetcher{
		secrets: map[string]*corev1.Secret{
			"linear": {Data: map[string][]byte{"api-key": []byte("secret-key")}},
		},
		configMaps: map[string]*corev1.ConfigMap{
			"linear": {Data: map[string]string{"org": "acme"}},
		},
	}

	resolved, err := resolveMCPServers(context.Background(), servers, fetcher)
	if err != nil {
		t.Fatalf("resolveMCPServers() error = %v", err)
	}

	payload := mcpServersPayload(resolved)
	var decoded []mcp.Server
	if err := json.Unmarshal([]byte(payload), &decoded); err != nil {
		t.Fatalf("payload is not valid JSON: %v", err)
	}
	if len(decoded) != 1 || decoded[0].Name != "linear" {
		t.Fatalf("payload = %#v", decoded)
	}
	if decoded[0].Headers["Authorization"] != "Bearer token" {
		t.Fatalf("literal header = %#v", decoded[0].Headers)
	}
	if decoded[0].Headers["X-Api-Key"] != "secret-key" {
		t.Fatalf("secret header = %#v", decoded[0].Headers)
	}
	if decoded[0].Headers["X-Org"] != "acme" {
		t.Fatalf("configmap header = %#v", decoded[0].Headers)
	}
}

func TestResolveMCPServers_MissingSecret(t *testing.T) {
	servers := []v1alpha1.MCPServer{{
		Name: "linear",
		URL:  "https://mcp.linear.app/mcp",
		Headers: []v1alpha1.MCPServerHeader{{
			Name: "Authorization",
			ValueFrom: &corev1.EnvVarSource{
				SecretKeyRef: &corev1.SecretKeySelector{
					LocalObjectReference: corev1.LocalObjectReference{Name: "missing"},
					Key:                  "token",
				},
			},
		}},
	}}

	_, err := resolveMCPServers(context.Background(), servers, &fakeConfigurationFetcher{})
	if err == nil {
		t.Fatal("expected missing secret to fail")
	}
}

func TestResolveMCPServers_RejectsFieldRef(t *testing.T) {
	servers := []v1alpha1.MCPServer{{
		Name: "linear",
		URL:  "https://mcp.linear.app/mcp",
		Headers: []v1alpha1.MCPServerHeader{{
			Name: "PodName",
			ValueFrom: &corev1.EnvVarSource{
				FieldRef: &corev1.ObjectFieldSelector{FieldPath: "metadata.name"},
			},
		}},
	}}

	_, err := resolveMCPServers(context.Background(), servers, &fakeConfigurationFetcher{})
	if err == nil {
		t.Fatal("expected fieldRef to be rejected")
	}
}

func TestResolveMCPServers_Empty(t *testing.T) {
	resolved, err := resolveMCPServers(context.Background(), nil, &fakeConfigurationFetcher{})
	if err != nil || resolved != nil {
		t.Fatalf("resolveMCPServers(nil) = %#v, %v", resolved, err)
	}
}

func TestEnvVarValue_MissingKey(t *testing.T) {
	fetcher := &fakeConfigurationFetcher{
		secrets: map[string]*corev1.Secret{
			"linear": {Data: map[string][]byte{"other": []byte("x")}},
		},
	}
	_, err := envVarValue(context.Background(), fetcher, &corev1.EnvVarSource{
		SecretKeyRef: &corev1.SecretKeySelector{
			LocalObjectReference: corev1.LocalObjectReference{Name: "linear"},
			Key:                  "token",
		},
	})
	if err == nil {
		t.Fatal("expected missing key to fail")
	}
}
