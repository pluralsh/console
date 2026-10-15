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
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"

	"github.com/pluralsh/console/go/deployment-operator/api/v1alpha1"
)

func newSecretTestReconciler(t *testing.T, objects ...client.Object) *AgentRunReconciler {
	t.Helper()
	scheme := runtime.NewScheme()
	require.NoError(t, corev1.AddToScheme(scheme))
	return &AgentRunReconciler{
		Client:      fake.NewClientBuilder().WithScheme(scheme).WithObjects(objects...).Build(),
		Scheme:      scheme,
		ConsoleURL:  "https://console.test.com",
		DeployToken: "deploy-token",
	}
}

func newSecretTestRun(name, uid string) *v1alpha1.AgentRun {
	run := &v1alpha1.AgentRun{ObjectMeta: metav1.ObjectMeta{Name: name, Namespace: "ns", UID: types.UID(uid)}}
	run.Status.ID = lo.ToPtr(name + "-id")
	return run
}

func getTestSecret(t *testing.T, r *AgentRunReconciler, name string) *corev1.Secret {
	t.Helper()
	secret := &corev1.Secret{}
	require.NoError(t, r.Get(context.Background(), types.NamespacedName{Name: name, Namespace: "ns"}, secret))
	return secret
}

func TestRunSecretNamesDoNotCollide(t *testing.T) {
	// "x-plural" and "x-env" are names another run's secrets would take under a shared suffix scheme.
	names := map[string]string{}
	for _, run := range []string{"x", "x-plural", "x-env"} {
		for _, name := range []string{runSecretName(run), pluralSecretName(run)} {
			if other, ok := names[name]; ok {
				t.Fatalf("secret %q is shared by runs %q and %q", name, other, run)
			}
			names[name] = run
		}
	}
}

func TestReconcileSecretsCreateOwnedSecrets(t *testing.T) {
	r := newSecretTestReconciler(t)
	run := newSecretTestRun("x", "uid-x")

	_, err := r.reconcilePodSecret(context.Background(), run, &v1alpha1.AgentRuntime{})
	require.NoError(t, err)
	_, err = r.reconcilePluralSecret(context.Background(), run)
	require.NoError(t, err)

	runSecret := getTestSecret(t, r, runSecretName("x"))
	assert.Equal(t, "uid-x", runSecret.Annotations[agentRunUIDAnnotation])
	// The fake client stores StringData as sent; the API server would merge it into Data.
	assert.NotContains(t, runSecret.StringData, EnvDeployToken)

	pluralSecret := getTestSecret(t, r, pluralSecretName("x"))
	assert.Equal(t, "uid-x", pluralSecret.Annotations[agentRunUIDAnnotation])
	assert.Equal(t, "deploy-token", pluralSecret.StringData[EnvDeployToken])
}

func TestReconcilePluralSecretUpdatesOwnToken(t *testing.T) {
	existing := &corev1.Secret{
		ObjectMeta: runSecretMeta(pluralSecretName("x"), newSecretTestRun("x", "uid-x")),
		Data:       map[string][]byte{EnvDeployToken: []byte("old-token")},
	}
	r := newSecretTestReconciler(t, existing)

	_, err := r.reconcilePluralSecret(context.Background(), newSecretTestRun("x", "uid-x"))
	require.NoError(t, err)
	assert.Equal(t, "deploy-token", getTestSecret(t, r, pluralSecretName("x")).StringData[EnvDeployToken])
}

func TestReconcileSecretsRejectSecretsOfAnotherRun(t *testing.T) {
	cases := map[string]map[string]string{
		"another run's secret": {agentRunUIDAnnotation: "uid-other"},
		"unannotated secret":   nil,
	}

	for name, annotations := range cases {
		t.Run(name, func(t *testing.T) {
			run := newSecretTestRun("x", "uid-x")
			foreign := func(secretName string) *corev1.Secret {
				return &corev1.Secret{
					ObjectMeta: metav1.ObjectMeta{Name: secretName, Namespace: "ns", Annotations: annotations},
					Data:       map[string][]byte{"other": []byte("data")},
				}
			}
			r := newSecretTestReconciler(t, foreign(runSecretName("x")), foreign(pluralSecretName("x")))

			_, err := r.reconcilePodSecret(context.Background(), run, &v1alpha1.AgentRuntime{})
			assert.Error(t, err)
			_, err = r.reconcilePluralSecret(context.Background(), run)
			assert.Error(t, err)

			// Neither secret may gain this run's data, least of all the deploy token.
			for _, secretName := range []string{runSecretName("x"), pluralSecretName("x")} {
				secret := getTestSecret(t, r, secretName)
				assert.Empty(t, secret.StringData, secretName)
				assert.Equal(t, map[string][]byte{"other": []byte("data")}, secret.Data, secretName)
			}
		})
	}
}
