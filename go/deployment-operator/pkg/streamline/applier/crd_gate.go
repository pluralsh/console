package applier

import (
	"context"
	"fmt"
	"sync"
	"time"

	"golang.org/x/sync/singleflight"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/util/wait"
	"k8s.io/klog/v2"

	discoverycache "github.com/pluralsh/console/go/deployment-operator/pkg/cache/discovery"
	"github.com/pluralsh/console/go/deployment-operator/pkg/common"
	"github.com/pluralsh/console/go/deployment-operator/pkg/log"
	smcommon "github.com/pluralsh/console/go/deployment-operator/pkg/streamline/common"
	"github.com/pluralsh/console/go/deployment-operator/pkg/streamline/store"
)

const crdGateWaitTimeout = 30 * time.Second

var crdGateBackoff = wait.Backoff{
	Duration: 100 * time.Millisecond,
	Factor:   1.5,
	Jitter:   0.1,
	Steps:    100,
	Cap:      2 * time.Second,
}

type crdGate struct {
	store          store.Store
	discoveryCache discoverycache.Cache
	waitTimeout    time.Duration
	backoff        wait.Backoff

	mu    sync.RWMutex
	crds  map[schema.GroupVersionKind]unstructured.Unstructured
	waits singleflight.Group
}

type CRDGateOption func(*crdGate)

func withCRDGateResources(resources []unstructured.Unstructured, dryRun bool) CRDGateOption {
	return func(gate *crdGate) {
		if dryRun {
			return
		}

		candidates := make(map[schema.GroupVersionKind]unstructured.Unstructured)
		for _, resource := range resources {
			if !common.IsCRD(resource) {
				continue
			}

			component, err := gate.store.GetAppliedComponent(resource)
			if err != nil {
				klog.V(log.LogLevelExtended).ErrorS(err, "could not classify CRD for apply-scoped readiness", "crd", resource.GetName())
				continue
			}
			if component != nil {
				continue
			}

			for _, gvk := range common.ServedCRDGVKs(resource) {
				candidates[gvk] = resource
				klog.V(log.LogLevelDebug).InfoS("registered CRD gate candidate", "crd", resource.GetName(), "gvk", gvk.String())
			}
		}
		if len(candidates) == 0 {
			klog.V(log.LogLevelTrace).InfoS("no CRD gate candidates registered")
			return
		}

		gate.mu.Lock()
		defer gate.mu.Unlock()
		for gvk, crd := range candidates {
			gate.crds[gvk] = crd
		}
	}
}

func newCRDGate(store store.Store, discoveryCache discoverycache.Cache, opts ...CRDGateOption) *crdGate {
	result := &crdGate{
		store:          store,
		discoveryCache: discoveryCache,
		waitTimeout:    crdGateWaitTimeout,
		backoff:        crdGateBackoff,
		crds:           make(map[schema.GroupVersionKind]unstructured.Unstructured),
	}

	for _, opt := range opts {
		opt(result)
	}

	return result
}

func (in *crdGate) Run(ctx context.Context, condition GateCondition, resource unstructured.Unstructured) error {
	switch condition {
	case GateConditionPreApply:
		return in.waitForMapping(ctx, resource.GroupVersionKind())
	case GateConditionPostApply:
		in.markApplied(resource)
		return nil
	default:
		return nil
	}
}

func (in *crdGate) Enabled() bool {
	return len(in.crds) > 0
}

func (in *crdGate) markApplied(resource unstructured.Unstructured) {
	if !common.IsCRD(resource) || resource.GetUID() == "" {
		klog.V(log.LogLevelTrace).InfoS("skipping CRD gate mark-applied for non-CRD or missing UID", "resource", resource.GetName(), "gvk", resource.GroupVersionKind().String(), "uid", resource.GetUID())
		return
	}

	key := smcommon.NewStoreKeyFromUnstructured(resource)
	in.mu.Lock()
	defer in.mu.Unlock()

	for gvk, candidate := range in.crds {
		if smcommon.NewStoreKeyFromUnstructured(candidate) != key {
			continue
		}

		in.crds[gvk] = resource
		klog.V(log.LogLevelDebug).InfoS("marked CRD gate candidate as applied", "crd", resource.GetName(), "gvk", gvk.String(), "uid", resource.GetUID())
	}
}

func (in *crdGate) waitForMapping(ctx context.Context, gvk schema.GroupVersionKind) error {
	crd, eligible := in.appliedCRD(gvk)
	if !eligible {
		klog.V(log.LogLevelTrace).InfoS("skipping CRD gate wait for ineligible GVK", "gvk", gvk.String())
		return nil
	}
	if err := ctx.Err(); err != nil {
		klog.V(log.LogLevelDebug).ErrorS(err, "CRD gate wait context already cancelled", "crd", crd.GetName(), "gvk", gvk.String(), "uid", crd.GetUID())
		return err
	}

	klog.V(log.LogLevelDebug).InfoS("waiting for CRD gate REST mapping", "crd", crd.GetName(), "gvk", gvk.String(), "uid", crd.GetUID(), "timeout", in.waitTimeout.String())
	resultCh := in.waits.DoChan(gvk.String(), func() (any, error) {
		return in.resolve(ctx, gvk, crd)
	})

	select {
	case <-ctx.Done():
		klog.V(log.LogLevelDebug).ErrorS(ctx.Err(), "CRD gate wait cancelled", "crd", crd.GetName(), "gvk", gvk.String(), "uid", crd.GetUID())
		return ctx.Err()
	case result := <-resultCh:
		if err := ctx.Err(); err != nil {
			klog.V(log.LogLevelDebug).ErrorS(err, "CRD gate wait context cancelled after result", "crd", crd.GetName(), "gvk", gvk.String(), "uid", crd.GetUID())
			return err
		}
		if result.Err != nil {
			klog.V(log.LogLevelDefault).ErrorS(result.Err, "CRD gate wait failed", "crd", crd.GetName(), "gvk", gvk.String(), "uid", crd.GetUID())
			return result.Err
		}

		klog.V(log.LogLevelDebug).InfoS("CRD gate REST mapping is ready", "crd", crd.GetName(), "gvk", gvk.String(), "uid", crd.GetUID())
		return nil
	}
}

func (in *crdGate) appliedCRD(gvk schema.GroupVersionKind) (unstructured.Unstructured, bool) {
	in.mu.RLock()
	defer in.mu.RUnlock()

	crd, ok := in.crds[gvk]
	return crd, ok && crd.GetUID() != ""
}

func (in *crdGate) resolve(ctx context.Context, gvk schema.GroupVersionKind, crd unstructured.Unstructured) (any, error) {
	ctx, cancel := context.WithTimeout(ctx, in.waitTimeout)
	defer cancel()

	klog.V(log.LogLevelDebug).InfoS("resolving CRD gate REST mapping", "crd", crd.GetName(), "gvk", gvk.String(), "uid", crd.GetUID())
	var lastErr error
	err := wait.ExponentialBackoffWithContext(ctx, in.backoff, func(ctx context.Context) (bool, error) {
		established, err := in.store.IsCRDEstablished(crd)
		if err != nil {
			lastErr = err
			klog.V(log.LogLevelTrace).ErrorS(err, "CRD gate establishment check failed", "crd", crd.GetName(), "gvk", gvk.String(), "uid", crd.GetUID())
			return false, nil
		}
		if !established {
			lastErr = fmt.Errorf("CRD %s is not established", crd.GetName())
			klog.V(log.LogLevelTrace).InfoS("CRD gate waiting for CRD establishment", "crd", crd.GetName(), "gvk", gvk.String(), "uid", crd.GetUID())
			return false, nil
		}

		in.discoveryCache.ResetRESTMapper()
		_, err = in.discoveryCache.RestMapping(gvk)
		if err != nil {
			lastErr = err
			klog.V(log.LogLevelTrace).ErrorS(err, "CRD gate REST mapping not ready", "crd", crd.GetName(), "gvk", gvk.String(), "uid", crd.GetUID())
			return false, nil
		}

		in.discoveryCache.Add(gvk)
		klog.V(log.LogLevelDebug).InfoS("resolved CRD gate REST mapping", "crd", crd.GetName(), "gvk", gvk.String(), "uid", crd.GetUID())
		return true, nil
	})
	if err == nil {
		return nil, nil
	}
	if lastErr == nil {
		lastErr = err
	}

	return nil, fmt.Errorf("timed out waiting for CRD %s to establish REST mapping for %s after %s: %v: %w",
		crd.GetName(), gvk.String(), in.waitTimeout, lastErr, err)
}
