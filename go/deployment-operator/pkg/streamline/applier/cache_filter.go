package applier

import (
	"github.com/pluralsh/deployment-operator/internal/utils"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/klog/v2"

	"github.com/pluralsh/deployment-operator/pkg/streamline/common"

	"github.com/pluralsh/deployment-operator/internal/metrics"
	"github.com/pluralsh/deployment-operator/pkg/log"
	"github.com/pluralsh/deployment-operator/pkg/streamline"
	"github.com/pluralsh/deployment-operator/pkg/streamline/store"
)

const (
	FilterCache Filter = "cache-filter"
)

// CacheFilter filters based on whether resources and/or manifests have changed since last applied.
func CacheFilter() FilterFunc {
	return func(obj unstructured.Unstructured) bool {
		serviceID := common.GetOwningInventory(obj)

		entry, err := streamline.GetGlobalStore().GetComponent(obj)
		if err != nil {
			klog.V(log.LogLevelExtended).ErrorS(err, "failed to get component from store")
			metrics.Record().ResourceCacheMiss(serviceID)
			return true
		}
		if entry == nil {
			klog.V(log.LogLevelDebug).InfoS("component not found in store",
				"gvk", obj.GroupVersionKind(), "name", obj.GetName(), "namespace", obj.GetNamespace())
			metrics.Record().ResourceCacheMiss(serviceID)
			return true
		}

		newManifestSHA, err := utils.HashResource(obj)
		if err != nil {
			klog.V(log.LogLevelExtended).ErrorS(err, "failed to hash resource")
			metrics.Record().ResourceCacheMiss(serviceID)
			return true
		}

		if entry.ShouldApply(newManifestSHA) {
			klog.V(log.LogLevelDebug).InfoS("resource requires apply",
				"gvk", obj.GroupVersionKind(), "name", obj.GetName(), "namespace", obj.GetNamespace())
			if err = streamline.GetGlobalStore().UpdateComponentSHA(obj, store.TransientManifestSHA); err != nil {
				klog.V(log.LogLevelExtended).ErrorS(err, "failed to update component SHA")
			}
			metrics.Record().ResourceCacheMiss(serviceID)
			return true
		}

		klog.V(log.LogLevelDebug).InfoS("resource is cached",
			"gvk", obj.GroupVersionKind(), "name", obj.GetName(), "namespace", obj.GetNamespace())
		metrics.Record().ResourceCacheHit(serviceID)
		return false
	}
}
