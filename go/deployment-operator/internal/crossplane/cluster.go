package crossplane

import (
	"context"
	"fmt"

	xpv1 "github.com/crossplane/crossplane-runtime/apis/common/v1"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/api/meta"
	k8sClient "sigs.k8s.io/controller-runtime/pkg/client"
)

var kubeconfigSecretKeys = []string{
	"kubeconfig",
	"kubeconfig.json",
	"attribute.kubeconfig",
}

// ManagedCluster is implemented by Crossplane provider Cluster managed resources.
type ManagedCluster interface {
	k8sClient.Object
	GetWriteConnectionSecretToReference() *xpv1.SecretReference
	GetPublishConnectionDetailsTo() *xpv1.PublishConnectionDetailsTo
	GetCondition(ct xpv1.ConditionType) xpv1.Condition
}

// IsReady reports whether the managed cluster Ready condition is True.
func IsReady(cluster ManagedCluster) bool {
	return cluster.GetCondition(xpv1.TypeReady).Status == corev1.ConditionTrue
}

// HasConnectionSecretConfig reports whether the managed resource publishes connection details to a secret.
func HasConnectionSecretConfig(cluster ManagedCluster) bool {
	if cluster == nil {
		return false
	}

	if ref := cluster.GetWriteConnectionSecretToReference(); ref != nil && ref.Name != "" {
		return true
	}

	if publishRef := cluster.GetPublishConnectionDetailsTo(); publishRef != nil && publishRef.Name != "" {
		return true
	}

	return false
}

// ConnectionSecretRef resolves the connection secret target from a managed cluster.
func ConnectionSecretRef(cluster ManagedCluster, defaultNamespace string) (namespace, name string, err error) {
	ref := cluster.GetWriteConnectionSecretToReference()
	if ref != nil && ref.Name != "" {
		namespace = ref.Namespace
		if namespace == "" {
			namespace = cluster.GetNamespace()
		}
		if namespace == "" {
			namespace = defaultNamespace
		}
		if namespace == "" {
			return "", "", fmt.Errorf("spec.writeConnectionSecretToRef.namespace is required for cluster-scoped managed resources")
		}

		return namespace, ref.Name, nil
	}

	publishRef := cluster.GetPublishConnectionDetailsTo()
	if publishRef != nil && publishRef.Name != "" {
		namespace = cluster.GetNamespace()
		if namespace == "" {
			namespace = defaultNamespace
		}
		if namespace == "" {
			return "", "", fmt.Errorf("publishConnectionDetailsTo requires a target namespace for cluster-scoped managed resources")
		}

		return namespace, publishRef.Name, nil
	}

	return "", "", fmt.Errorf("spec.writeConnectionSecretToRef or spec.publishConnectionDetailsTo is not set")
}

// KubeconfigFromConnectionSecret extracts kubeconfig bytes from a Crossplane connection secret.
func KubeconfigFromConnectionSecret(secret *corev1.Secret) ([]byte, error) {
	for _, key := range kubeconfigSecretKeys {
		if data, ok := secret.Data[key]; ok && len(data) > 0 {
			return data, nil
		}
	}

	return nil, fmt.Errorf("connection secret %s/%s does not contain kubeconfig", secret.Namespace, secret.Name)
}

// GetKubeconfig loads kubeconfig bytes from the connection secret referenced by the Cluster.
func GetKubeconfig(ctx context.Context, c k8sClient.Client, cluster ManagedCluster, defaultNamespace string) ([]byte, error) {
	namespace, name, err := ConnectionSecretRef(cluster, defaultNamespace)
	if err != nil {
		return nil, err
	}

	return GetKubeconfigFromSecret(ctx, c, namespace, name)
}

// GetKubeconfigFromSecret loads kubeconfig bytes from an existing secret.
func GetKubeconfigFromSecret(ctx context.Context, c k8sClient.Client, namespace, name string) ([]byte, error) {
	secret := &corev1.Secret{}
	if err := c.Get(ctx, k8sClient.ObjectKey{Namespace: namespace, Name: name}, secret); err != nil {
		return nil, err
	}

	return KubeconfigFromConnectionSecret(secret)
}

// IsClusterNotFound reports whether the error indicates the managed cluster CRD or object is missing.
func IsClusterNotFound(err error) bool {
	return apierrors.IsNotFound(err) || meta.IsNoMatchError(err)
}
