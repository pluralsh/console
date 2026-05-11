package store

import (
	"context"
	"time"

	"github.com/DataDog/dd-trace-go/v2/ddtrace/tracer"
	"github.com/pluralsh/console/go/polly/containers"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/client"

	"github.com/pluralsh/deployment-operator/pkg/log"
	smcommon "github.com/pluralsh/deployment-operator/pkg/streamline/common"
)

// ProfiledStore is a wrapper around a Store that adds Datadog tracing
// for all database-related operations.
//
// It assumes Datadog's tracer has been initialized elsewhere in the
// application (see cmd/agent/args/datadog.go).
type ProfiledStore struct {
	inner Store
}

// NewProfiledStore wraps the provided Store with Datadog tracing.
// If inner is nil it returns nil.
func NewProfiledStore(inner Store) Store {
	if inner == nil {
		return nil
	}
	return &ProfiledStore{inner: inner}
}

// trace is a small helper that creates a Datadog span around a store
// operation and measures its duration.
func trace(ctx context.Context, op string, fn func() error) error {
	now := time.Now()
	defer func() {
		klog.V(log.LogLevelDebug).InfoS("tracing database call", "op", op, "duration", time.Since(now))
	}()
	if ctx == nil {
		ctx = context.Background()
	}

	span, _ := tracer.StartSpanFromContext(ctx, "db.store", tracer.ResourceName(op))
	defer func() {
		span.Finish(tracer.FinishTime(time.Now()))
	}()

	if err := fn(); err != nil {
		span.SetTag("error", true)
		span.SetTag("error.msg", err.Error())
		return err
	}

	return nil
}

// SaveComponent wraps Store.SaveComponent with tracing.
func (p *ProfiledStore) SaveComponent(obj unstructured.Unstructured) error {
	return trace(context.Background(), "SaveComponent", func() error {
		return p.inner.SaveComponent(obj)
	})
}

// SaveComponents wraps Store.SaveComponents with tracing.
func (p *ProfiledStore) SaveComponents(obj []unstructured.Unstructured) error {
	return trace(context.Background(), "SaveComponents", func() error {
		return p.inner.SaveComponents(obj)
	})
}

// SaveUnsyncedComponents wraps Store.SaveUnsyncedComponents with tracing.
func (p *ProfiledStore) SaveUnsyncedComponents(obj []unstructured.Unstructured) error {
	return trace(context.Background(), "SaveUnsyncedComponents", func() error {
		return p.inner.SaveUnsyncedComponents(obj)
	})
}

// SyncServiceComponents wraps Store.SyncServiceComponents with tracing.
func (p *ProfiledStore) SyncServiceComponents(serviceID string, resources []unstructured.Unstructured) error {
	return trace(context.Background(), "SyncServiceComponents", func() error {
		return p.inner.SyncServiceComponents(serviceID, resources)
	})
}

// GetAppliedComponent wraps Store.GetAppliedComponent with tracing.
func (p *ProfiledStore) GetAppliedComponent(obj unstructured.Unstructured) (*smcommon.Component, error) {
	var (
		res *smcommon.Component
		err error
	)
	_ = trace(context.Background(), "GetAppliedComponent", func() error {
		res, err = p.inner.GetAppliedComponent(obj)
		return err
	})
	return res, err
}

// GetAppliedComponentByUID wraps Store.GetAppliedComponentByUID with tracing.
func (p *ProfiledStore) GetAppliedComponentByUID(uid types.UID) (*client.ComponentChildAttributes, error) {
	var (
		res *client.ComponentChildAttributes
		err error
	)
	_ = trace(context.Background(), "GetAppliedComponentByUID", func() error {
		res, err = p.inner.GetAppliedComponentByUID(uid)
		return err
	})
	return res, err
}

// GetAppliedComponentsByGVK wraps Store.GetAppliedComponentsByGVK with tracing.
func (p *ProfiledStore) GetAppliedComponentsByGVK(gvk schema.GroupVersionKind) ([]smcommon.Component, error) {
	var (
		res []smcommon.Component
		err error
	)
	_ = trace(context.Background(), "GetAppliedComponentsByGVK", func() error {
		res, err = p.inner.GetAppliedComponentsByGVK(gvk)
		return err
	})
	return res, err
}

// DeleteComponent wraps Store.DeleteComponent with tracing.
func (p *ProfiledStore) DeleteComponent(key smcommon.StoreKey) error {
	return trace(context.Background(), "DeleteComponent", func() error {
		return p.inner.DeleteComponent(key)
	})
}

// DeleteComponents wraps Store.DeleteComponents with tracing.
func (p *ProfiledStore) DeleteComponents(group, version, kind string) error {
	return trace(context.Background(), "DeleteComponents", func() error {
		return p.inner.DeleteComponents(group, version, kind)
	})
}

// DeleteUnsyncedComponentsByKeys wraps Store.DeleteUnsyncedComponentsByKeys with tracing.
func (p *ProfiledStore) DeleteUnsyncedComponentsByKeys(objects containers.Set[smcommon.StoreKey]) error {
	return trace(context.Background(), "DeleteUnsyncedComponentsByKeys", func() error {
		return p.inner.DeleteUnsyncedComponentsByKeys(objects)
	})
}

// GetServiceComponents wraps Store.GetServiceComponents with tracing.
func (p *ProfiledStore) GetServiceComponents(serviceID string, onlyApplied bool) (smcommon.Components, error) {
	var (
		res smcommon.Components
		err error
	)
	_ = trace(context.Background(), "GetServiceComponents", func() error {
		res, err = p.inner.GetServiceComponents(serviceID, onlyApplied)
		return err
	})
	return res, err
}

// GetComponentCounts wraps Store.GetComponentCounts with tracing.
func (p *ProfiledStore) GetComponentCounts() (nodeCount, namespaceCount int64, err error) {
	_ = trace(context.Background(), "GetComponentCounts", func() error {
		nodeCount, namespaceCount, err = p.inner.GetComponentCounts()
		return err
	})
	return
}

func (p *ProfiledStore) GetComponentAttributes(serviceID string, isDeleting bool) (attrs []client.ComponentAttributes, err error) {
	_ = trace(context.Background(), "GetComponentAttributes", func() error {
		attrs, err = p.inner.GetComponentAttributes(serviceID, isDeleting)
		return err
	})
	return
}

func (p *ProfiledStore) GetServiceComponentsWithChildren(serviceID string, onlyApplied bool) (attrs []client.ComponentAttributes, err error) {
	_ = trace(context.Background(), "GetServiceComponentsWithChildren", func() error {
		attrs, err = p.inner.GetServiceComponentsWithChildren(serviceID, onlyApplied)
		return err
	})
	return
}

// GetNodeStatistics wraps Store.GetNodeStatistics with tracing.
func (p *ProfiledStore) GetNodeStatistics() ([]*client.NodeStatisticAttributes, error) {
	var (
		res []*client.NodeStatisticAttributes
		err error
	)
	_ = trace(context.Background(), "GetNodeStatistics", func() error {
		res, err = p.inner.GetNodeStatistics()
		return err
	})
	return res, err
}

// GetHealthScore wraps Store.GetHealthScore with tracing.
func (p *ProfiledStore) GetHealthScore() (int64, error) {
	var (
		res int64
		err error
	)
	_ = trace(context.Background(), "GetHealthScore", func() error {
		res, err = p.inner.GetHealthScore()
		return err
	})
	return res, err
}

// UpdateComponentSHA wraps Store.UpdateComponentSHA with tracing.
func (p *ProfiledStore) UpdateComponentSHA(obj unstructured.Unstructured, t SHAType) error {
	return trace(context.Background(), "UpdateComponentSHA", func() error {
		return p.inner.UpdateComponentSHA(obj, t)
	})
}

// CommitTransientSHA wraps Store.CommitTransientSHA with tracing.
func (p *ProfiledStore) CommitTransientSHA(obj unstructured.Unstructured) error {
	return trace(context.Background(), "CommitTransientSHA", func() error {
		return p.inner.CommitTransientSHA(obj)
	})
}

// SyncAppliedResource wraps Store.SyncAppliedResource with tracing.
func (p *ProfiledStore) SyncAppliedResource(obj unstructured.Unstructured) error {
	return trace(context.Background(), "SyncAppliedResource", func() error {
		return p.inner.SyncAppliedResource(obj)
	})
}

// ExpireSHA wraps Store.ExpireSHA with tracing.
func (p *ProfiledStore) ExpireSHA(obj unstructured.Unstructured) error {
	return trace(context.Background(), "ExpireSHA", func() error {
		return p.inner.ExpireSHA(obj)
	})
}

// SetComponentUnsynced wraps Store.SetComponentUnsynced with tracing.
func (p *ProfiledStore) SetComponentUnsynced(obj unstructured.Unstructured) error {
	return trace(context.Background(), "SetComponentUnsynced", func() error {
		return p.inner.SetComponentUnsynced(obj)
	})
}

// Expire wraps Store.Expire with tracing.
func (p *ProfiledStore) Expire(serviceID string) error {
	return trace(context.Background(), "Expire", func() error {
		return p.inner.Expire(serviceID)
	})
}

// ExpireOlderThan wraps Store.ExpireOlderThan with tracing.
func (p *ProfiledStore) ExpireOlderThan(ttl time.Duration) error {
	return trace(context.Background(), "ExpireOlderThan", func() error {
		return p.inner.ExpireOlderThan(ttl)
	})
}

// Shutdown wraps Store.Shutdown with tracing.
func (p *ProfiledStore) Shutdown() error {
	return trace(context.Background(), "Shutdown", func() error {
		return p.inner.Shutdown()
	})
}

// GetResourceHealth wraps Store.GetResourceHealth with tracing.
func (p *ProfiledStore) GetResourceHealth(resources []unstructured.Unstructured) (hasPendingResources, hasFailedResources bool, err error) {
	_ = trace(context.Background(), "GetResourceHealth", func() error {
		hasPendingResources, hasFailedResources, err = p.inner.GetResourceHealth(resources)
		return err
	})
	return
}

// GetHookComponents wraps Store.GetHookComponents with tracing.
func (p *ProfiledStore) GetHookComponents(serviceID string) ([]smcommon.HookComponent, error) {
	var (
		res []smcommon.HookComponent
		err error
	)
	_ = trace(context.Background(), "GetHookComponents", func() error {
		res, err = p.inner.GetHookComponents(serviceID)
		return err
	})
	return res, err
}

// GetComponentInsights wraps Store.GetComponentInsights with tracing.
func (p *ProfiledStore) GetComponentInsights() ([]client.ClusterInsightComponentAttributes, error) {
	var (
		res []client.ClusterInsightComponentAttributes
		err error
	)
	_ = trace(context.Background(), "GetComponentInsights", func() error {
		res, err = p.inner.GetComponentInsights()
		return err
	})
	return res, err
}

// SaveComponentAttributes wraps Store.SaveComponentAttributes with tracing.
func (p *ProfiledStore) SaveComponentAttributes(obj client.ComponentChildAttributes, args ...any) error {
	var err error
	_ = trace(context.Background(), "SaveComponentAttributes", func() error {
		err = p.inner.SaveComponentAttributes(obj, args)
		return err
	})
	return err
}

// SaveHookComponentWithManifestSHA wraps Store.SaveHookComponentWithManifestSHA with tracing.
func (p *ProfiledStore) SaveHookComponentWithManifestSHA(manifest, appliedResource unstructured.Unstructured) error {
	return trace(context.Background(), "SaveHookComponentWithManifestSHA", func() error {
		return p.inner.SaveHookComponentWithManifestSHA(manifest, appliedResource)
	})
}

// ExpireHookComponents wraps Store.ExpireHookComponents with tracing.
func (p *ProfiledStore) ExpireHookComponents(serviceID string) error {
	return trace(context.Background(), "ExpireHookComponents", func() error {
		return p.inner.ExpireHookComponents(serviceID)
	})
}

// SetServiceChildren wraps Store.SetServiceChildren with tracing.
func (p *ProfiledStore) SetServiceChildren(serviceID, parentUID string, keys []smcommon.StoreKey) (int, error) {
	var (
		res int
		err error
	)
	_ = trace(context.Background(), "SetServiceChildren", func() error {
		res, err = p.inner.SetServiceChildren(serviceID, parentUID, keys)
		return err
	})
	return res, err
}
