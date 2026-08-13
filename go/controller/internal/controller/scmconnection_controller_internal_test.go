package controller

import (
	"context"
	"testing"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"

	"github.com/pluralsh/console/go/controller/api/v1alpha1"
	"github.com/pluralsh/console/go/controller/internal/utils"
)

func TestScmConnectionTokenSecretReferenceIndex(t *testing.T) {
	scheme := runtime.NewScheme()
	if err := corev1.AddToScheme(scheme); err != nil {
		t.Fatalf("add core scheme: %v", err)
	}
	if err := v1alpha1.AddToScheme(scheme); err != nil {
		t.Fatalf("add deployments scheme: %v", err)
	}

	matchingConnection := &v1alpha1.ScmConnection{
		ObjectMeta: metav1.ObjectMeta{Name: "matching"},
		Spec: v1alpha1.ScmConnectionSpec{
			Type:           "GITHUB",
			TokenSecretRef: &corev1.SecretReference{Name: "token", Namespace: "credentials"},
		},
	}
	defaultNamespaceConnection := &v1alpha1.ScmConnection{
		ObjectMeta: metav1.ObjectMeta{Name: "default-namespace"},
		Spec: v1alpha1.ScmConnectionSpec{
			Type:           "GITHUB",
			TokenSecretRef: &corev1.SecretReference{Name: "token"},
		},
	}
	otherConnection := &v1alpha1.ScmConnection{
		ObjectMeta: metav1.ObjectMeta{Name: "other"},
		Spec: v1alpha1.ScmConnectionSpec{
			Type:           "GITHUB",
			TokenSecretRef: &corev1.SecretReference{Name: "other-token", Namespace: "credentials"},
		},
	}

	k8sClient := fake.NewClientBuilder().
		WithScheme(scheme).
		WithObjects(matchingConnection, defaultNamespaceConnection, otherConnection).
		WithIndex(&v1alpha1.ScmConnection{}, scmConnectionTokenSecretRefField, scmConnectionTokenSecretRefIndex).
		Build()
	reconciler := &ScmConnectionReconciler{Client: k8sClient}

	matchingValues := scmConnectionTokenSecretRefIndex(matchingConnection)
	if len(matchingValues) != 1 || matchingValues[0] != "credentials/token" {
		t.Fatalf("unexpected matching connection index values: %#v", matchingValues)
	}

	indexedConnections := new(v1alpha1.ScmConnectionList)
	if err := k8sClient.List(context.Background(), indexedConnections, client.MatchingFields{scmConnectionTokenSecretRefField: "credentials/token"}); err != nil {
		t.Fatalf("list indexed SCM connections: %v", err)
	}
	if len(indexedConnections.Items) != 1 {
		t.Fatalf("expected one indexed SCM connection, got %#v", indexedConnections.Items)
	}

	requests := reconciler.requestsForSecret(context.Background(), &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{Name: "token", Namespace: "credentials"},
	})
	if len(requests) != 1 {
		t.Fatalf("expected one SCM connection request, got %d", len(requests))
	}
	if requests[0].NamespacedName != (types.NamespacedName{Name: "matching"}) {
		t.Fatalf("unexpected request: %#v", requests[0])
	}

	requests = reconciler.requestsForSecret(context.Background(), &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{Name: "token", Namespace: "default"},
	})
	if len(requests) != 1 {
		t.Fatalf("expected one default namespace SCM connection request, got %d", len(requests))
	}
	if requests[0].NamespacedName != (types.NamespacedName{Name: "default-namespace"}) {
		t.Fatalf("unexpected default namespace request: %#v", requests[0])
	}
}

func TestScmConnectionDiffIncludesResolvedSecret(t *testing.T) {
	scm := &v1alpha1.ScmConnection{
		Spec: v1alpha1.ScmConnectionSpec{
			Name:           "github",
			TokenSecretRef: &corev1.SecretReference{Name: "token", Namespace: "credentials"},
		},
	}
	secret := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{Name: "token", Namespace: "credentials"},
		Type:       corev1.SecretTypeOpaque,
		Data:       map[string][]byte{},
	}
	secret.Data["username"] = []byte("bot")
	secret.Data["token"] = []byte("first-token")

	changed, firstSHA, err := scm.Diff(utils.HashObject, secret)
	if err != nil {
		t.Fatalf("calculate first desired SHA: %v", err)
	}
	if !changed {
		t.Fatal("expected initial desired state to differ")
	}

	secretWithDifferentInsertionOrder := secret.DeepCopy()
	secretWithDifferentInsertionOrder.Data = map[string][]byte{}
	secretWithDifferentInsertionOrder.Data["token"] = []byte("first-token")
	secretWithDifferentInsertionOrder.Data["username"] = []byte("bot")
	_, reorderedSHA, err := scm.Diff(utils.HashObject, secretWithDifferentInsertionOrder)
	if err != nil {
		t.Fatalf("calculate reordered desired SHA: %v", err)
	}
	if reorderedSHA != firstSHA {
		t.Fatalf("expected deterministic SHA for equivalent Secret data, got %q and %q", firstSHA, reorderedSHA)
	}

	scm.Status.SHA = &firstSHA
	secret.Data["token"] = []byte("rotated-token")
	changed, rotatedSHA, err := scm.Diff(utils.HashObject, secret)
	if err != nil {
		t.Fatalf("calculate rotated desired SHA: %v", err)
	}
	if !changed {
		t.Fatal("expected Secret content change to alter desired state")
	}
	if rotatedSHA == firstSHA {
		t.Fatal("expected Secret content change to alter desired SHA")
	}
}
