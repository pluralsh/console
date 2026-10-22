package controller

import (
	"context"
	"testing"

	"github.com/pluralsh/console/go/controller/api/v1alpha1"
)

func TestIgnoreClustersPreservesExplicitEmptyList(t *testing.T) {
	reconciler := &GlobalServiceReconciler{}

	omitted := reconciler.ignoreClusters(context.Background(), &v1alpha1.GlobalService{})
	if omitted != nil {
		t.Fatalf("expected omitted ignoreClusters to remain nil, got %#v", omitted)
	}

	explicitEmpty := reconciler.ignoreClusters(context.Background(), &v1alpha1.GlobalService{
		Spec: v1alpha1.GlobalServiceSpec{IgnoreClusters: []string{}},
	})
	if explicitEmpty == nil {
		t.Fatal("expected explicit empty ignoreClusters to be preserved")
	}
	if len(*explicitEmpty) != 0 {
		t.Fatalf("expected explicit empty ignoreClusters to stay empty, got %#v", *explicitEmpty)
	}
}
