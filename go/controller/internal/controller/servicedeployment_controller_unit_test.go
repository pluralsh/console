package controller

import (
	"context"
	"testing"

	"github.com/samber/lo"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
	"sigs.k8s.io/controller-runtime/pkg/event"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	"github.com/pluralsh/console/go/controller/api/v1alpha1"
)

func importing(name string, stacks ...string) *v1alpha1.ServiceDeployment {
	return &v1alpha1.ServiceDeployment{
		ObjectMeta: metav1.ObjectMeta{Name: name, Namespace: "apps"},
		Spec: v1alpha1.ServiceSpec{
			Imports: lo.Map(stacks, func(s string, _ int) v1alpha1.ServiceImport {
				return v1alpha1.ServiceImport{StackRef: corev1.ObjectReference{Name: s, Namespace: "apps"}}
			}),
		},
	}
}

// Two services importing one stack used to fight over a single owner annotation on it, each write re-enqueuing
// the other forever.
func TestStackChangesReachEveryImportingService(t *testing.T) {
	scheme := runtime.NewScheme()
	if err := v1alpha1.AddToScheme(scheme); err != nil {
		t.Fatal(err)
	}
	c := fake.NewClientBuilder().
		WithScheme(scheme).
		WithIndex(&v1alpha1.ServiceDeployment{}, ServiceImportsIndex, importedStacks).
		WithObjects(
			importing("nodes", "shared"),
			importing("substrate", "shared", "other"),
			importing("unrelated", "other"),
			importing("none"),
		).
		Build()

	stack := &v1alpha1.InfrastructureStack{ObjectMeta: metav1.ObjectMeta{Name: "shared", Namespace: "apps"}}
	got := lo.Map(servicesImporting(c)(context.Background(), stack), func(r reconcile.Request, _ int) types.NamespacedName {
		return r.NamespacedName
	})

	want := []types.NamespacedName{{Namespace: "apps", Name: "nodes"}, {Namespace: "apps", Name: "substrate"}}
	if !lo.ElementsMatch(got, want) {
		t.Fatalf("expected %v, got %v", want, got)
	}
}

func TestOnlyStackIDChangesReachServices(t *testing.T) {
	stack := func(id *string, rv string) *v1alpha1.InfrastructureStack {
		s := &v1alpha1.InfrastructureStack{ObjectMeta: metav1.ObjectMeta{Name: "s", ResourceVersion: rv}}
		s.Status.ID = id
		return s
	}

	if stackIDChanged.Update(event.UpdateEvent{ObjectOld: stack(lo.ToPtr("a"), "1"), ObjectNew: stack(lo.ToPtr("a"), "2")}) {
		t.Fatal("a stack update that keeps its ID must not reconcile importing services")
	}
	if !stackIDChanged.Update(event.UpdateEvent{ObjectOld: stack(nil, "1"), ObjectNew: stack(lo.ToPtr("a"), "2")}) {
		t.Fatal("a stack getting its ID must reconcile importing services")
	}
	if !stackIDChanged.Create(event.CreateEvent{Object: stack(nil, "1")}) || !stackIDChanged.Delete(event.DeleteEvent{Object: stack(nil, "1")}) {
		t.Fatal("stack creation and deletion must reconcile importing services")
	}
}
