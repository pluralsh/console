package crossplane

import (
	"errors"
	"testing"

	xpv1 "github.com/crossplane/crossplane-runtime/apis/common/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func TestIsReady(t *testing.T) {
	cluster := &AWSCluster{}
	cluster.Status.SetConditions(xpv1.Available())

	if !IsReady(cluster) {
		t.Fatal("expected managed cluster to be ready")
	}
}

func TestConnectionSecretRef(t *testing.T) {
	cluster := &AWSCluster{
		ObjectMeta: metav1.ObjectMeta{
			Namespace: "infra",
		},
		Spec: AWSClusterSpec{
			ResourceSpec: xpv1.ResourceSpec{
				WriteConnectionSecretToReference: &xpv1.SecretReference{
					Name:      "eks-kubeconfig",
					Namespace: "secrets",
				},
			},
		},
	}

	namespace, name, err := ConnectionSecretRef(cluster, "")
	if err != nil {
		t.Fatalf("ConnectionSecretRef() error = %v", err)
	}
	if namespace != "secrets" || name != "eks-kubeconfig" {
		t.Fatalf("got namespace=%q name=%q", namespace, name)
	}
}

func TestConnectionSecretRefDefaultsNamespace(t *testing.T) {
	cluster := &AWSCluster{
		ObjectMeta: metav1.ObjectMeta{
			Namespace: "infra",
		},
		Spec: AWSClusterSpec{
			ResourceSpec: xpv1.ResourceSpec{
				WriteConnectionSecretToReference: &xpv1.SecretReference{
					Name: "eks-kubeconfig",
				},
			},
		},
	}

	namespace, name, err := ConnectionSecretRef(cluster, "")
	if err != nil {
		t.Fatalf("ConnectionSecretRef() error = %v", err)
	}
	if namespace != "infra" || name != "eks-kubeconfig" {
		t.Fatalf("got namespace=%q name=%q", namespace, name)
	}
}

func TestConnectionSecretRefClusterScopedUsesDefaultNamespace(t *testing.T) {
	cluster := &AWSCluster{
		ObjectMeta: metav1.ObjectMeta{
			Name: "cp-eks-small",
		},
		Spec: AWSClusterSpec{
			ResourceSpec: xpv1.ResourceSpec{
				WriteConnectionSecretToReference: &xpv1.SecretReference{
					Name: "cp-eks-small-kubeconfig",
				},
			},
		},
	}

	namespace, name, err := ConnectionSecretRef(cluster, "default")
	if err != nil {
		t.Fatalf("ConnectionSecretRef() error = %v", err)
	}
	if namespace != "default" || name != "cp-eks-small-kubeconfig" {
		t.Fatalf("got namespace=%q name=%q", namespace, name)
	}
}

func TestConnectionSecretRefPublishConnectionDetailsTo(t *testing.T) {
	cluster := &AWSCluster{
		ObjectMeta: metav1.ObjectMeta{
			Name: "cp-eks-small",
		},
		Spec: AWSClusterSpec{
			ResourceSpec: xpv1.ResourceSpec{
				PublishConnectionDetailsTo: &xpv1.PublishConnectionDetailsTo{
					Name: "cp-eks-small-kubeconfig",
				},
			},
		},
	}

	namespace, name, err := ConnectionSecretRef(cluster, "default")
	if err != nil {
		t.Fatalf("ConnectionSecretRef() error = %v", err)
	}
	if namespace != "default" || name != "cp-eks-small-kubeconfig" {
		t.Fatalf("got namespace=%q name=%q", namespace, name)
	}
}

func TestKubeconfigFromConnectionSecret(t *testing.T) {
	secret := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{Name: "conn", Namespace: "infra"},
		Data: map[string][]byte{
			"kubeconfig": []byte("apiVersion: v1\n"),
		},
	}

	kubeconfig, err := KubeconfigFromConnectionSecret(secret)
	if err != nil {
		t.Fatalf("KubeconfigFromConnectionSecret() error = %v", err)
	}
	if string(kubeconfig) != "apiVersion: v1\n" {
		t.Fatalf("unexpected kubeconfig: %q", string(kubeconfig))
	}
}

func TestGetClusterUnsupportedProvider(t *testing.T) {
	_, err := GetCluster(t.Context(), nil, corev1.ObjectReference{
		APIVersion: "container.gcp.crossplane.io/v1beta1",
		Kind:       "Cluster",
		Name:       "gke",
		Namespace:  "infra",
	})
	if !errors.Is(err, ErrUnsupportedProvider) {
		t.Fatalf("expected ErrUnsupportedProvider, got %v", err)
	}
}
