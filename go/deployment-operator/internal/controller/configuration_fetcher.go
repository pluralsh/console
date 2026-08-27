package controller

import (
	"context"
	"fmt"

	corev1 "k8s.io/api/core/v1"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

// ConfigurationFetcher loads Secrets and ConfigMaps referenced by AgentRuntime configuration.
type ConfigurationFetcher interface {
	GetSecret(ctx context.Context, selector corev1.SecretKeySelector) (*corev1.Secret, error)
	GetConfigMap(ctx context.Context, selector corev1.ConfigMapKeySelector) (*corev1.ConfigMap, error)
}

type kubeConfigurationFetcher struct {
	client    client.Client
	namespace string
}

func (r *AgentRunReconciler) configurationFetcher(namespace string) ConfigurationFetcher {
	return &kubeConfigurationFetcher{client: r.Client, namespace: namespace}
}

func (f *kubeConfigurationFetcher) GetSecret(ctx context.Context, selector corev1.SecretKeySelector) (*corev1.Secret, error) {
	secret := &corev1.Secret{}
	err := f.client.Get(ctx, client.ObjectKey{Namespace: f.namespace, Name: selector.Name}, secret)
	return secret, err
}

func (f *kubeConfigurationFetcher) GetConfigMap(ctx context.Context, selector corev1.ConfigMapKeySelector) (*corev1.ConfigMap, error) {
	cm := &corev1.ConfigMap{}
	err := f.client.Get(ctx, client.ObjectKey{Namespace: f.namespace, Name: selector.Name}, cm)
	return cm, err
}

func secretGetter(ctx context.Context, fetcher ConfigurationFetcher) func(corev1.SecretKeySelector) (*corev1.Secret, error) {
	return func(selector corev1.SecretKeySelector) (*corev1.Secret, error) {
		return fetcher.GetSecret(ctx, selector)
	}
}

func configurationSecretKey(ctx context.Context, fetcher ConfigurationFetcher, selector corev1.SecretKeySelector) (string, error) {
	secret, err := fetcher.GetSecret(ctx, selector)
	if err != nil {
		return "", err
	}
	value, exists := secret.Data[selector.Key]
	if !exists {
		return "", fmt.Errorf("secret %s does not contain key %s", selector.Name, selector.Key)
	}
	return string(value), nil
}

func configurationConfigMapKey(ctx context.Context, fetcher ConfigurationFetcher, selector corev1.ConfigMapKeySelector) (string, error) {
	cm, err := fetcher.GetConfigMap(ctx, selector)
	if err != nil {
		return "", err
	}
	value, exists := cm.Data[selector.Key]
	if !exists {
		return "", fmt.Errorf("configmap %s does not contain key %s", selector.Name, selector.Key)
	}
	return value, nil
}

func envVarValue(ctx context.Context, fetcher ConfigurationFetcher, src *corev1.EnvVarSource) (string, error) {
	switch {
	case src.SecretKeyRef != nil:
		return configurationSecretKey(ctx, fetcher, *src.SecretKeyRef)
	case src.ConfigMapKeyRef != nil:
		return configurationConfigMapKey(ctx, fetcher, *src.ConfigMapKeyRef)
	default:
		return "", fmt.Errorf("valueFrom must set secretKeyRef or configMapKeyRef")
	}
}
