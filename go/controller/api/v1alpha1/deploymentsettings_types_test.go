package v1alpha1_test

import (
	"context"
	"testing"

	console "github.com/pluralsh/console/go/client"
	"github.com/samber/lo"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"

	"github.com/pluralsh/console/go/controller/api/v1alpha1"
)

func TestLoggingSettingsLokiAttributes(t *testing.T) {
	scheme := runtime.NewScheme()
	_ = corev1.AddToScheme(scheme)

	secret := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{Name: "loki", Namespace: "default"},
		Data:       map[string][]byte{"password": []byte("s3cret")},
	}
	c := fake.NewClientBuilder().WithScheme(scheme).WithObjects(secret).Build()

	settings := &v1alpha1.LoggingSettings{
		Enabled: lo.ToPtr(true),
		Driver:  lo.ToPtr(console.LogDriverLoki),
		Loki: &v1alpha1.LokiConnection{
			HTTPConnection: v1alpha1.HTTPConnection{
				Host: "http://loki:3100",
				User: lo.ToPtr("user"),
				PasswordSecretRef: &corev1.SecretKeySelector{
					LocalObjectReference: corev1.LocalObjectReference{Name: "loki"},
					Key:                  "password",
				},
			},
			ClusterLabel:   lo.ToPtr("k8s_cluster_name"),
			NamespaceLabel: lo.ToPtr("k8s_namespace_name"),
		},
	}

	attr, err := settings.Attributes(context.Background(), c, "default")
	require.NoError(t, err)
	assert.Equal(t, lo.ToPtr(console.LogDriverLoki), attr.Driver)
	assert.Equal(t, &console.LokiLoggingConnectionAttributes{
		Host:           "http://loki:3100",
		User:           lo.ToPtr("user"),
		Password:       lo.ToPtr("s3cret"),
		ClusterLabel:   lo.ToPtr("k8s_cluster_name"),
		NamespaceLabel: lo.ToPtr("k8s_namespace_name"),
	}, attr.Loki)
}

func TestLoggingSettingsLokiMissingSecret(t *testing.T) {
	scheme := runtime.NewScheme()
	_ = corev1.AddToScheme(scheme)
	c := fake.NewClientBuilder().WithScheme(scheme).Build()

	settings := &v1alpha1.LoggingSettings{
		Loki: &v1alpha1.LokiConnection{
			HTTPConnection: v1alpha1.HTTPConnection{
				Host: "http://loki:3100",
				PasswordSecretRef: &corev1.SecretKeySelector{
					LocalObjectReference: corev1.LocalObjectReference{Name: "missing"},
					Key:                  "password",
				},
			},
		},
	}

	_, err := settings.Attributes(context.Background(), c, "default")
	assert.Error(t, err)
}
