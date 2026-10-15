package controller

import (
	"context"
	"testing"

	"github.com/samber/lo"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"

	"github.com/pluralsh/console/go/deployment-operator/api/v1alpha1"
)

func TestReconcilePodSecretDropsLegacyDeployToken(t *testing.T) {
	scheme := runtime.NewScheme()
	require.NoError(t, corev1.AddToScheme(scheme))

	// A run secret created before the deploy token moved to the plural secret.
	legacy := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{Name: "run", Namespace: "ns"},
		Data: map[string][]byte{
			EnvConsoleURL:  []byte("https://console.test.com"),
			EnvAgentRunID:  []byte("run-id"),
			EnvDeployToken: []byte("deploy-token"),
		},
	}
	reconciler := &AgentRunReconciler{
		Client:      fake.NewClientBuilder().WithScheme(scheme).WithObjects(legacy).Build(),
		Scheme:      scheme,
		ConsoleURL:  "https://console.test.com",
		DeployToken: "deploy-token",
	}
	run := &v1alpha1.AgentRun{ObjectMeta: metav1.ObjectMeta{Name: "run", Namespace: "ns"}}
	run.Status.ID = lo.ToPtr("run-id")

	_, err := reconciler.reconcilePodSecret(context.Background(), run, &v1alpha1.AgentRuntime{})
	require.NoError(t, err)

	secret := &corev1.Secret{}
	require.NoError(t, reconciler.Get(context.Background(), types.NamespacedName{Name: "run", Namespace: "ns"}, secret))
	// The API server merges StringData into Data on write; the fake client stores both as sent.
	assert.NotContains(t, secret.Data, EnvDeployToken)
	assert.NotContains(t, secret.StringData, EnvDeployToken)
	assert.Equal(t, "run-id", secret.StringData[EnvAgentRunID])
	assert.Equal(t, "https://console.test.com", secret.StringData[EnvConsoleURL])
}
