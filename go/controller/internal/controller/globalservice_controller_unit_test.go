package controller

import (
	"context"
	"errors"
	"strings"
	"testing"

	"github.com/pluralsh/console/go/controller/api/v1alpha1"
	"github.com/pluralsh/console/go/controller/internal/test/mocks"
)

func TestIgnoreClustersPreservesExplicitEmptyList(t *testing.T) {
	reconciler := &GlobalServiceReconciler{}

	omitted, err := reconciler.ignoreClusters(context.Background(), &v1alpha1.GlobalService{})
	if err != nil {
		t.Fatalf("ignoreClusters returned an error for omitted ignoreClusters: %v", err)
	}
	if omitted != nil {
		t.Fatalf("expected omitted ignoreClusters to remain nil, got %#v", omitted)
	}

	explicitEmpty, err := reconciler.ignoreClusters(context.Background(), &v1alpha1.GlobalService{
		Spec: v1alpha1.GlobalServiceSpec{IgnoreClusters: []string{}},
	})
	if err != nil {
		t.Fatalf("ignoreClusters returned an error for empty ignoreClusters: %v", err)
	}
	if explicitEmpty == nil {
		t.Fatal("expected explicit empty ignoreClusters to be preserved")
	}
	if len(*explicitEmpty) != 0 {
		t.Fatalf("expected explicit empty ignoreClusters to stay empty, got %#v", *explicitEmpty)
	}
}

func TestIgnoreClustersReturnsLookupErrors(t *testing.T) {
	consoleClient := mocks.NewConsoleClientMock(t)
	consoleClient.On("GetClusterIdByHandle", "missing-a").Return("", errors.New("missing-a not found"))
	consoleClient.On("GetClusterIdByHandle", "missing-b").Return("", errors.New("missing-b not found"))

	reconciler := &GlobalServiceReconciler{ConsoleClient: consoleClient}
	clusters, err := reconciler.ignoreClusters(context.Background(), &v1alpha1.GlobalService{
		Spec: v1alpha1.GlobalServiceSpec{IgnoreClusters: []string{"missing-a", "missing-b"}},
	})
	if err == nil {
		t.Fatal("expected lookup errors")
	}
	if clusters != nil {
		t.Fatalf("expected no clusters when all lookups fail, got %#v", clusters)
	}
	if !strings.Contains(err.Error(), "missing-a not found") || !strings.Contains(err.Error(), "missing-b not found") {
		t.Fatalf("expected aggregate error to include both lookup errors, got %v", err)
	}
}
