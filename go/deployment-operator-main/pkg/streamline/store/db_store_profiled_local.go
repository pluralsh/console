package store

import (
	"context"
	"time"

	"github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/polly/containers"
	"github.com/pluralsh/deployment-operator/pkg/log"
	smcommon "github.com/pluralsh/deployment-operator/pkg/streamline/common"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/klog/v2"
)

var storeTimeout = 5 * time.Second
var slowThreshold = 100 * time.Millisecond

type ProfiledStoreLocal struct {
	inner Store
}

// trace wraps a store call with duration logging + timeout cancellation.
func traceLocal(parentCtx context.Context, op string, fn func() error) error {
	ctx, cancel := context.WithTimeout(parentCtx, storeTimeout)
	defer cancel()

	start := time.Now()

	errCh := make(chan error, 1)

	// Run the store operation in a goroutine
	go func() {
		// fn() has no ctx — we can't cancel it internally
		errCh <- fn()
	}()

	var err error

	select {
	case err = <-errCh:
		// completed normally
	case <-ctx.Done():
		// profiling timeout hit
		klog.V(log.LogLevelInfo).Infof("[STORE][TIMEOUT] %s timed out after %s", op, storeTimeout)
		err = ctx.Err() // DeadlineExceeded
	}

	elapsed := time.Since(start)

	klog.V(log.LogLevelInfo).Infof("[STORE] %s took %s (err=%v)", op, elapsed, err)

	if elapsed > slowThreshold {
		klog.V(log.LogLevelInfo).Infof("[STORE][SLOW] %s exceeded slow threshold (%s)", op, elapsed)
	}

	return err
}

func (p ProfiledStoreLocal) SaveComponent(obj unstructured.Unstructured) error {
	return traceLocal(context.Background(), "SaveComponent", func() error {
		return p.inner.SaveComponent(obj)
	})
}

func (p ProfiledStoreLocal) SaveComponents(obj []unstructured.Unstructured) error {
	return traceLocal(context.Background(), "SaveComponents", func() error {
		return p.inner.SaveComponents(obj)
	})
}

func (p ProfiledStoreLocal) SaveUnsyncedComponents(obj []unstructured.Unstructured) error {
	return traceLocal(context.Background(), "SaveUnsyncedComponents", func() error {
		return p.inner.SaveUnsyncedComponents(obj)
	})
}

// SyncServiceComponents wraps Store.SyncServiceComponents with tracing.
func (p *ProfiledStoreLocal) SyncServiceComponents(serviceID string, resources []unstructured.Unstructured) error {
	return traceLocal(context.Background(), "SyncServiceComponents", func() error {
		return p.inner.SyncServiceComponents(serviceID, resources)
	})
}

// GetAppliedComponent wraps Store.GetAppliedComponent with tracing.
func (p *ProfiledStoreLocal) GetAppliedComponent(obj unstructured.Unstructured) (*smcommon.Component, error) {
	var (
		res *smcommon.Component
		err error
	)
	_ = traceLocal(context.Background(), "GetAppliedComponent", func() error {
		res, err = p.inner.GetAppliedComponent(obj)
		return err
	})
	return res, err
}

// GetAppliedComponentByUID wraps Store.GetAppliedComponentByUID with tracing.
func (p *ProfiledStoreLocal) GetAppliedComponentByUID(uid types.UID) (*client.ComponentChildAttributes, error) {
	var (
		res *client.ComponentChildAttributes
		err error
	)
	_ = traceLocal(context.Background(), "GetAppliedComponentByUID", func() error {
		res, err = p.inner.GetAppliedComponentByUID(uid)
		return err
	})
	return res, err
}

// GetAppliedComponentsByGVK wraps Store.GetAppliedComponentsByGVK with tracing.
func (p *ProfiledStoreLocal) GetAppliedComponentsByGVK(gvk schema.GroupVersionKind) ([]smcommon.Component, error) {
	var (
		res []smcommon.Component
		err error
	)
	_ = traceLocal(context.Background(), "GetAppliedComponentsByGVK", func() error {
		res, err = p.inner.GetAppliedComponentsByGVK(gvk)
		return err
	})
	return res, err
}

// DeleteComponent wraps Store.DeleteComponent with tracing.
func (p *ProfiledStoreLocal) DeleteComponent(key smcommon.StoreKey) error {
	return traceLocal(context.Background(), "DeleteComponent", func() error {
		return p.inner.DeleteComponent(key)
	})
}

// DeleteComponents wraps Store.DeleteComponents with tracing.
func (p *ProfiledStoreLocal) DeleteComponents(group, version, kind string) error {
	return traceLocal(context.Background(), "DeleteComponents", func() error {
		return p.inner.DeleteComponents(group, version, kind)
	})
}

// DeleteUnsyncedComponentsByKeys wraps Store.DeleteUnsyncedComponentsByKeys with tracing.
func (p *ProfiledStoreLocal) DeleteUnsyncedComponentsByKeys(objects containers.Set[smcommon.StoreKey]) error {
	return traceLocal(context.Background(), "DeleteUnsyncedComponentsByKeys", func() error {
		return p.inner.DeleteUnsyncedComponentsByKeys(objects)
	})
}

// GetServiceComponents wraps Store.GetServiceComponents with tracing.
func (p *ProfiledStoreLocal) GetServiceComponents(serviceID string, onlyApplied bool) (smcommon.Components, error) {
	var (
		res smcommon.Components
		err error
	)
	_ = traceLocal(context.Background(), "GetServiceComponents", func() error {
		res, err = p.inner.GetServiceComponents(serviceID, onlyApplied)
		return err
	})
	return res, err
}

// GetComponentInsights wraps Store.GetComponentInsights with tracing.
func (p *ProfiledStoreLocal) GetComponentInsights() ([]client.ClusterInsightComponentAttributes, error) {
	var (
		res []client.ClusterInsightComponentAttributes
		err error
	)
	_ = traceLocal(context.Background(), "GetComponentInsights", func() error {
		res, err = p.inner.GetComponentInsights()
		return err
	})
	return res, err
}

// GetComponentCounts wraps Store.GetComponentCounts with tracing.
func (p *ProfiledStoreLocal) GetComponentCounts() (nodeCount, namespaceCount int64, err error) {
	_ = traceLocal(context.Background(), "GetComponentCounts", func() error {
		nodeCount, namespaceCount, err = p.inner.GetComponentCounts()
		return err
	})
	return
}

func (p *ProfiledStoreLocal) GetComponentAttributes(serviceID string, isDeleting bool) (attrs []client.ComponentAttributes, err error) {
	_ = traceLocal(context.Background(), "GetComponentAttributes", func() error {
		attrs, err = p.inner.GetComponentAttributes(serviceID, isDeleting)
		return err
	})
	return
}

func (p *ProfiledStoreLocal) GetServiceComponentsWithChildren(serviceID string, onlyApplied bool) (attrs []client.ComponentAttributes, err error) {
	_ = traceLocal(context.Background(), "GetServiceComponentsWithChildren", func() error {
		attrs, err = p.inner.GetServiceComponentsWithChildren(serviceID, onlyApplied)
		return err
	})
	return
}

// GetNodeStatistics wraps Store.GetNodeStatistics with tracing.
func (p *ProfiledStoreLocal) GetNodeStatistics() ([]*client.NodeStatisticAttributes, error) {
	var (
		res []*client.NodeStatisticAttributes
		err error
	)
	_ = traceLocal(context.Background(), "GetNodeStatistics", func() error {
		res, err = p.inner.GetNodeStatistics()
		return err
	})
	return res, err
}

// GetHealthScore wraps Store.GetHealthScore with tracing.
func (p *ProfiledStoreLocal) GetHealthScore() (int64, error) {
	var (
		res int64
		err error
	)
	_ = traceLocal(context.Background(), "GetHealthScore", func() error {
		res, err = p.inner.GetHealthScore()
		return err
	})
	return res, err
}

// UpdateComponentSHA wraps Store.UpdateComponentSHA with tracing.
func (p *ProfiledStoreLocal) UpdateComponentSHA(obj unstructured.Unstructured, t SHAType) error {
	return traceLocal(context.Background(), "UpdateComponentSHA", func() error {
		return p.inner.UpdateComponentSHA(obj, t)
	})
}

// CommitTransientSHA wraps Store.CommitTransientSHA with tracing.
func (p *ProfiledStoreLocal) CommitTransientSHA(obj unstructured.Unstructured) error {
	return traceLocal(context.Background(), "CommitTransientSHA", func() error {
		return p.inner.CommitTransientSHA(obj)
	})
}

// SyncAppliedResource wraps Store.SyncAppliedResource with tracing.
func (p *ProfiledStoreLocal) SyncAppliedResource(obj unstructured.Unstructured) error {
	return traceLocal(context.Background(), "SyncAppliedResource", func() error {
		return p.inner.SyncAppliedResource(obj)
	})
}

// ExpireSHA wraps Store.ExpireSHA with tracing.
func (p *ProfiledStoreLocal) ExpireSHA(obj unstructured.Unstructured) error {
	return traceLocal(context.Background(), "ExpireSHA", func() error {
		return p.inner.ExpireSHA(obj)
	})
}

// Expire wraps Store.Expire with tracing.
func (p *ProfiledStoreLocal) Expire(serviceID string) error {
	return traceLocal(context.Background(), "Expire", func() error {
		return p.inner.Expire(serviceID)
	})
}

// ExpireOlderThan wraps Store.ExpireOlderThan with tracing.
func (p *ProfiledStoreLocal) ExpireOlderThan(ttl time.Duration) error {
	return traceLocal(context.Background(), "ExpireOlderThan", func() error {
		return p.inner.ExpireOlderThan(ttl)
	})
}

// Shutdown wraps Store.Shutdown with tracing.
func (p *ProfiledStoreLocal) Shutdown() error {
	return traceLocal(context.Background(), "Shutdown", func() error {
		return p.inner.Shutdown()
	})
}

// GetResourceHealth wraps Store.GetResourceHealth with tracing.
func (p *ProfiledStoreLocal) GetResourceHealth(resources []unstructured.Unstructured) (hasPendingResources, hasFailedResources bool, err error) {
	_ = traceLocal(context.Background(), "GetResourceHealth", func() error {
		hasPendingResources, hasFailedResources, err = p.inner.GetResourceHealth(resources)
		return err
	})
	return
}

// GetHookComponents wraps Store.GetHookComponents with tracing.
func (p *ProfiledStoreLocal) GetHookComponents(serviceID string) ([]smcommon.HookComponent, error) {
	var (
		res []smcommon.HookComponent
		err error
	)
	_ = traceLocal(context.Background(), "GetHookComponents", func() error {
		res, err = p.inner.GetHookComponents(serviceID)
		return err
	})
	return res, err
}

// SaveHookComponentWithManifestSHA wraps Store.SaveHookComponentWithManifestSHA with tracing.
func (p *ProfiledStoreLocal) SaveHookComponentWithManifestSHA(manifest, appliedResource unstructured.Unstructured) error {
	return traceLocal(context.Background(), "SaveHookComponentWithManifestSHA", func() error {
		return p.inner.SaveHookComponentWithManifestSHA(manifest, appliedResource)
	})
}

// ExpireHookComponents wraps Store.ExpireHookComponents with tracing.
func (p *ProfiledStoreLocal) ExpireHookComponents(serviceID string) error {
	return traceLocal(context.Background(), "ExpireHookComponents", func() error {
		return p.inner.ExpireHookComponents(serviceID)
	})
}

// SetServiceChildren wraps Store.SetServiceChildren with tracing.
func (p *ProfiledStoreLocal) SetServiceChildren(serviceID, parentUID string, keys []smcommon.StoreKey) (int, error) {
	var (
		res int
		err error
	)
	_ = traceLocal(context.Background(), "SetServiceChildren", func() error {
		res, err = p.inner.SetServiceChildren(serviceID, parentUID, keys)
		return err
	})
	return res, err
}

// SetComponentUnsynced wraps Store.SetComponentUnsynced with tracing.
func (p *ProfiledStoreLocal) SetComponentUnsynced(obj unstructured.Unstructured) error {
	return traceLocal(context.Background(), "SetComponentUnsynced", func() error {
		return p.inner.SetComponentUnsynced(obj)
	})
}

// SaveComponentAttributes wraps Store.SaveComponentAttributes with tracing.
func (p *ProfiledStoreLocal) SaveComponentAttributes(obj client.ComponentChildAttributes, args ...any) error {
	var err error
	_ = traceLocal(context.Background(), "SaveComponentAttributes", func() error {
		err = p.inner.SaveComponentAttributes(obj, args)
		return err
	})
	return err
}

func NewLocalProfiledStore(inner Store) Store {
	if inner == nil {
		return nil
	}
	return &ProfiledStoreLocal{inner: inner}
}
