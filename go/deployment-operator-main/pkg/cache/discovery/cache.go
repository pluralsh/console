package discovery

import (
	"fmt"
	"sync"
	"time"

	cmap "github.com/orcaman/concurrent-map/v2"
	"github.com/pluralsh/console/go/polly/containers"
	"github.com/samber/lo"
	"k8s.io/apimachinery/pkg/api/meta"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/util/wait"
	"k8s.io/apimachinery/pkg/version"
	"k8s.io/client-go/discovery"
	"k8s.io/klog/v2"

	"github.com/pluralsh/deployment-operator/pkg/log"
)

type GroupVersionUpdateFunc func(schema.GroupVersion)
type GroupVersionKindUpdateFunc func(schema.GroupVersionKind)
type GroupVersionResourceUpdateFunc func(schema.GroupVersionResource)

type Cache interface {
	// Add adds the provided GroupVersionKinds to the cache and
	// the corresponding GroupVersionResource as well as the APIVersion.
	Add(...schema.GroupVersionKind)

	// Delete removes the provided GroupVersionKinds from the cache and
	// the corresponding GroupVersionResource as well as the APIVersion.
	Delete(...schema.GroupVersionKind)

	// Refresh force refreshes the cache.
	Refresh() error

	// MaybeResetRESTMapper resets the RESTMapper if the provided GVKs are CustomResourceDefinitions.
	MaybeResetRESTMapper(...schema.GroupVersionKind)

	// GroupVersionKind returns the set of GroupVersionKinds in the cache.
	GroupVersionKind() containers.Set[schema.GroupVersionKind]

	// GroupVersionResource returns the set of GroupVersionResources in the cache.
	GroupVersionResource() containers.Set[schema.GroupVersionResource]

	// GroupVersion returns the set of GroupVersions in the cache.
	GroupVersion() containers.Set[schema.GroupVersion]

	// ServerVersion returns the Kubernetes server version.
	ServerVersion() *version.Info

	// KindFor returns GVK for provided GVR.
	KindFor(gvr schema.GroupVersionResource) (schema.GroupVersionKind, error)

	// RestMapping returns the RESTMapping for the provided GVK.
	RestMapping(gvk schema.GroupVersionKind) (*meta.RESTMapping, error)

	// OnGroupVersionAdded registers a callback function to be called when a new API group is added to the cache.
	OnGroupVersionAdded(f GroupVersionUpdateFunc)

	// OnGroupVersionDeleted registers a callback function to be called when an API group is deleted from the cache.
	OnGroupVersionDeleted(f GroupVersionUpdateFunc)

	// OnGroupVersionKindAdded registers a callback function to be called when a new GroupVersionKind is added to the cache.
	OnGroupVersionKindAdded(f GroupVersionKindUpdateFunc)

	// OnGroupVersionKindDeleted registers a callback function to be called when a GroupVersionKind is deleted from the cache.
	OnGroupVersionKindDeleted(f GroupVersionKindUpdateFunc)

	// OnGroupVersionResourceAdded registers a callback function to be called when a new GroupVersionResource is added to the cache.
	OnGroupVersionResourceAdded(f GroupVersionResourceUpdateFunc)

	// OnGroupVersionResourceDeleted registers a callback function to be called when a GroupVersionResource is deleted from the cache.
	OnGroupVersionResourceDeleted(f GroupVersionResourceUpdateFunc)
}

type cache struct {
	mu      sync.RWMutex
	cacheMu sync.RWMutex

	client discovery.DiscoveryInterface
	mapper meta.RESTMapper

	// gvkCache is a set of all GroupVersionKinds in the cache.
	gvkCache containers.Set[schema.GroupVersionKind]

	// gvrCache is a set of all GroupVersionResources in the cache.
	gvrCache containers.Set[schema.GroupVersionResource]

	// gvCache is a set of all API versions (group/version) in the cache.
	gvCache containers.Set[schema.GroupVersion]

	// gvrToGVKCache is a mapping of GroupVersionResource to GroupVersionKind.
	// This is used to avoid calling the RESTMapper for every conversion.
	gvrToGVKCache cmap.ConcurrentMap[schema.GroupVersionResource, schema.GroupVersionKind]

	// serverVersion is the Kubernetes server version.
	serverVersion *version.Info

	// onGroupVersionAdded is a list of callback functions to be called
	// when a new API group is added to the cache.
	onGroupVersionAdded []GroupVersionUpdateFunc

	// onGroupVersionDeleted is a list of callback functions to be called
	// when an API group is deleted from the cache.
	onGroupVersionDeleted []GroupVersionUpdateFunc

	// onGroupVersionKindAdded is a list of callback functions to be called
	// when a new GroupVersionKind is added to the cache.
	onGroupVersionKindAdded []GroupVersionKindUpdateFunc

	// onGroupVersionKindDeleted is a list of callback functions to be called
	// when a GroupVersionKind is deleted from the cache.
	onGroupVersionKindDeleted []GroupVersionKindUpdateFunc

	// onGroupVersionResourceAdded is a list of callback functions to be called
	// when a new GroupVersionResource is added to the cache.
	onGroupVersionResourceAdded []GroupVersionResourceUpdateFunc

	// onGroupVersionResourceDeleted is a list of callback functions to be called
	// when a GroupVersionResource is deleted from the cache.
	onGroupVersionResourceDeleted []GroupVersionResourceUpdateFunc
}

func (in *cache) Add(gvks ...schema.GroupVersionKind) {
	in.mu.Lock()
	defer in.mu.Unlock()

	for _, entry := range gvks {
		in.add(entry)
	}
}

func (in *cache) MaybeResetRESTMapper(crds ...schema.GroupVersionKind) {
	in.mu.Lock()
	defer in.mu.Unlock()

	if in.mapper == nil {
		klog.V(log.LogLevelVerbose).ErrorS(fmt.Errorf("no RESTMapper provided, cannot reset"), "unable to reset RESTMapper")
		return
	}

	for _, gvk := range crds {
		if in.gvkCache.Has(gvk) {
			continue
		}

		meta.MaybeResetRESTMapper(in.mapper)
		klog.V(log.LogLevelExtended).InfoS("resetting RESTMapper", "gvk", gvk)
		return
	}
}

func (in *cache) RestMapping(gvk schema.GroupVersionKind) (*meta.RESTMapping, error) {
	in.mu.Lock()
	mapping, err := in.mapper.RESTMapping(gvk.GroupKind(), gvk.Version)
	in.mu.Unlock()

	return mapping, err
}

func (in *cache) Delete(gvks ...schema.GroupVersionKind) {
	in.mu.Lock()
	defer in.mu.Unlock()

	for _, entry := range gvks {
		if in.gvkCache.Has(entry) {
			in.notifyGroupVersionKindDeleted(entry)
		}
		in.gvkCache.Remove(entry)
		klog.V(log.LogLevelDebug).InfoS("deleted gvk from cache", "gvk", entry)

		// Only delete GV if there are no more GVKs for that GV
		if !in.hasGroupVersion(entry.GroupVersion()) {
			in.gvCache.Remove(entry.GroupVersion())
			in.notifyGroupVersionDeleted(entry.GroupVersion())
			klog.V(log.LogLevelDebug).InfoS("deleted gv from cache", "gv", entry.GroupVersion())
		}

		gvr, err := in.toGroupVersionResource(entry)
		if in.gvrCache.Has(gvr) {
			in.notifyGroupVersionResourceDeleted(gvr)
		}

		if err != nil {
			klog.V(log.LogLevelExtended).ErrorS(err, "unable to map gvk to gvr", "gvk", entry)
			continue
		}

		in.gvrCache.Remove(gvr)
		klog.V(log.LogLevelDebug).InfoS("deleted gvr from cache", "gvr", gvr)
	}
}

func (in *cache) Refresh() error {
	in.mu.Lock()
	defer in.mu.Unlock()

	now := time.Now()
	klog.V(log.LogLevelTrace).InfoS("started discovery cache refresh")

	groups, resources, err := in.client.ServerGroupsAndResources()

	// Create temporary cache entries. We will replace the cache
	// entries with the ones from the discovery client
	// once we have successfully retrieved the server resources.
	gvkCache := containers.NewSet[schema.GroupVersionKind]()
	gvrCache := containers.NewSet[schema.GroupVersionResource]()
	gvCache := containers.NewSet[schema.GroupVersion]()
	gvrToGVKMap := cmap.NewStringer[schema.GroupVersionResource, schema.GroupVersionKind]()

	for _, group := range groups {
		for _, groupVersion := range group.Versions {
			in.addTo(schema.GroupVersionKind{
				Group:   group.Name,
				Version: lo.Ternary(lo.IsEmpty(groupVersion.Version), group.APIVersion, groupVersion.Version),
				Kind:    "",
			}, gvkCache, gvrCache, gvCache, gvrToGVKMap)
		}
	}

	var resourceWG sync.WaitGroup

	for _, resource := range resources {
		gv, err := schema.ParseGroupVersion(resource.GroupVersion)
		if err != nil {
			klog.V(log.LogLevelExtended).ErrorS(err, "unable to parse group version", "groupVersion", resource.GroupVersion)
			continue
		}

		for _, apiResource := range resource.APIResources {
			if len(apiResource.Verbs) == 0 {
				klog.V(log.LogLevelDebug).InfoS("skipping resource without verbs", "resource", apiResource)
				continue
			}

			gvk := schema.GroupVersionKind{
				Group:   gv.Group,
				Version: gv.Version,
				Kind:    apiResource.Kind,
			}

			resourceWG.Add(1)
			go func() {
				defer resourceWG.Done()
				in.addTo(gvk, gvkCache, gvrCache, gvCache, gvrToGVKMap)
			}()
		}
	}

	resourceWG.Wait()

	// Added entries that are not in the cache.
	addedGVKs := gvkCache.Difference(in.gvkCache)
	addedGVRs := gvrCache.Difference(in.gvrCache)
	addedGVs := gvCache.Difference(in.gvCache)

	for _, entry := range addedGVKs.List() {
		klog.V(log.LogLevelDebug).InfoS("gvk added", "gvk", entry)
		in.notifyGroupVersionKindAdded(entry)
	}

	for _, entry := range addedGVRs.List() {
		klog.V(log.LogLevelDebug).InfoS("gvr added", "gvr", entry)
		in.notifyGroupVersionResourceAdded(entry)
	}

	for _, entry := range addedGVs.List() {
		klog.V(log.LogLevelDebug).InfoS("gv added", "gv", entry)
		in.notifyGroupVersionAdded(entry)
	}

	// Delete entries that are no longer in the discovery client.
	deletedGVKs := in.gvkCache.Difference(gvkCache)
	deletedGVRs := in.gvrCache.Difference(gvrCache)
	deletedGVs := in.gvCache.Difference(gvCache)

	for _, entry := range deletedGVKs.List() {
		klog.V(log.LogLevelDebug).InfoS("gvk deleted", "gvk", entry)
		in.notifyGroupVersionKindDeleted(entry)
	}

	for _, entry := range deletedGVRs.List() {
		klog.V(log.LogLevelDebug).InfoS("gvr deleted", "gvr", entry)
		in.notifyGroupVersionResourceDeleted(entry)
	}

	for _, entry := range deletedGVs.List() {
		klog.V(log.LogLevelDebug).InfoS("gv deleted", "gv", entry)
		in.notifyGroupVersionDeleted(entry)
	}

	in.gvkCache = gvkCache
	in.gvrCache = gvrCache
	in.gvCache = gvCache
	in.gvrToGVKCache = gvrToGVKMap
	meta.MaybeResetRESTMapper(in.mapper)

	in.updateServerVersion()

	klog.V(log.LogLevelDefault).InfoS("finished discovery cache refresh", "duration", time.Since(now))
	// Do not immediately return err since groups and resources
	// might be partially filled in case of error.
	return err
}

func (in *cache) GroupVersionKind() containers.Set[schema.GroupVersionKind] {
	in.mu.RLock()
	defer in.mu.RUnlock()

	return in.gvkCache
}

func (in *cache) GroupVersionResource() containers.Set[schema.GroupVersionResource] {
	in.mu.RLock()
	defer in.mu.RUnlock()

	return in.gvrCache
}

func (in *cache) GroupVersion() containers.Set[schema.GroupVersion] {
	in.mu.RLock()
	defer in.mu.RUnlock()

	return in.gvCache
}

func (in *cache) KindFor(gvr schema.GroupVersionResource) (schema.GroupVersionKind, error) {
	if gvk, ok := in.gvrToGVKCache.Get(gvr); ok {
		return gvk, nil
	}

	in.mu.Lock()
	gvk, err := in.mapper.KindFor(gvr)
	in.mu.Unlock()
	if err != nil {
		return schema.GroupVersionKind{}, err
	}

	in.gvrToGVKCache.Set(gvr, gvk)
	return gvk, nil
}

func (in *cache) ServerVersion() *version.Info {
	in.mu.Lock()
	if in.serverVersion == nil {
		in.updateServerVersion()
	}
	in.mu.Unlock()

	in.mu.RLock()
	defer in.mu.RUnlock()

	return in.serverVersion
}

func (in *cache) OnGroupVersionAdded(f GroupVersionUpdateFunc) {
	in.mu.Lock()
	defer in.mu.Unlock()

	in.onGroupVersionAdded = append(in.onGroupVersionAdded, f)
}

func (in *cache) OnGroupVersionDeleted(f GroupVersionUpdateFunc) {
	in.mu.Lock()
	defer in.mu.Unlock()

	in.onGroupVersionDeleted = append(in.onGroupVersionDeleted, f)
}

func (in *cache) OnGroupVersionKindAdded(f GroupVersionKindUpdateFunc) {
	in.mu.Lock()
	defer in.mu.Unlock()

	in.onGroupVersionKindAdded = append(in.onGroupVersionKindAdded, f)
}

func (in *cache) OnGroupVersionKindDeleted(f GroupVersionKindUpdateFunc) {
	in.mu.Lock()
	defer in.mu.Unlock()

	in.onGroupVersionKindDeleted = append(in.onGroupVersionKindDeleted, f)
}

func (in *cache) OnGroupVersionResourceAdded(f GroupVersionResourceUpdateFunc) {
	in.mu.Lock()
	defer in.mu.Unlock()

	in.onGroupVersionResourceAdded = append(in.onGroupVersionResourceAdded, f)
}

func (in *cache) OnGroupVersionResourceDeleted(f GroupVersionResourceUpdateFunc) {
	in.mu.Lock()
	defer in.mu.Unlock()

	in.onGroupVersionResourceDeleted = append(in.onGroupVersionResourceDeleted, f)
}

func (in *cache) notifyGroupVersionAdded(gv schema.GroupVersion) {
	for _, f := range in.onGroupVersionAdded {
		go f(gv)
	}
}

func (in *cache) notifyGroupVersionDeleted(gv schema.GroupVersion) {
	for _, f := range in.onGroupVersionDeleted {
		go f(gv)
	}
}

func (in *cache) notifyGroupVersionKindAdded(gvk schema.GroupVersionKind) {
	for _, f := range in.onGroupVersionKindAdded {
		go f(gvk)
	}
}

func (in *cache) notifyGroupVersionKindDeleted(gvk schema.GroupVersionKind) {
	for _, f := range in.onGroupVersionKindDeleted {
		go f(gvk)
	}
}

func (in *cache) notifyGroupVersionResourceAdded(gvr schema.GroupVersionResource) {
	for _, f := range in.onGroupVersionResourceAdded {
		go f(gvr)
	}
}

func (in *cache) notifyGroupVersionResourceDeleted(gvr schema.GroupVersionResource) {
	for _, f := range in.onGroupVersionResourceDeleted {
		go f(gvr)
	}
}

func (in *cache) updateServerVersion() {
	serverVersion, err := in.client.ServerVersion()
	if err != nil {
		klog.V(log.LogLevelExtended).ErrorS(err, "unable to get server version")
		return
	}

	in.serverVersion = serverVersion
	klog.V(log.LogLevelDebug).InfoS("updated server version", "version", in.serverVersion.String())
}

func (in *cache) toGroupVersionResource(gvk schema.GroupVersionKind) (schema.GroupVersionResource, error) {
	var mapping *meta.RESTMapping
	var err error

	// Retry with exponential backoff until we get a REST mapping or error. This is to avoid scenarios where the
	// resource is registered via CRD controller event but not yet available in the discovery API.
	_ = wait.ExponentialBackoff(wait.Backoff{Duration: 50 * time.Millisecond, Jitter: 3, Steps: 3, Cap: 500 * time.Millisecond}, func() (bool, error) {
		mapping, err = in.mapper.RESTMapping(gvk.GroupKind(), gvk.Version)
		if err != nil || mapping == nil {
			klog.V(log.LogLevelDebug).InfoS("retrying to get REST mapping", "gvk", gvk, "err", err)
			return false, nil
		}

		return true, nil
	})
	if err != nil {
		return schema.GroupVersionResource{}, err
	}

	return mapping.Resource, nil
}

func (in *cache) add(gvk schema.GroupVersionKind) {
	in.cacheMu.Lock()
	defer in.cacheMu.Unlock()

	if !in.gvCache.Has(gvk.GroupVersion()) {
		in.gvCache.Add(gvk.GroupVersion())
		in.notifyGroupVersionAdded(gvk.GroupVersion())
		klog.V(log.LogLevelDebug).InfoS("added gv to cache", "gv", gvk.GroupVersion())
	}

	// if kind is empty, we are dealing with a server group and version only, not a resource.
	if len(gvk.Kind) == 0 {
		return
	}

	if !in.gvkCache.Has(gvk) {
		in.gvkCache.Add(gvk)
		in.notifyGroupVersionKindAdded(gvk)
		klog.V(log.LogLevelDebug).InfoS("added gvk to cache", "gvk", gvk)
	}

	gvr, err := in.toGroupVersionResource(gvk)
	if err != nil {
		klog.V(log.LogLevelExtended).ErrorS(err, "unable to map gvk to gvr", "gvk", gvk)
		return
	}

	if !in.gvrCache.Has(gvr) {
		in.gvrCache.Add(gvr)
		in.gvrToGVKCache.Set(gvr, gvk)
		in.notifyGroupVersionResourceAdded(gvr)
		klog.V(log.LogLevelDebug).InfoS("added gvr to cache", "gvr", gvr)
	}
}

func (in *cache) addTo(
	gvk schema.GroupVersionKind,
	gvkSet containers.Set[schema.GroupVersionKind],
	gvrSet containers.Set[schema.GroupVersionResource],
	gvSet containers.Set[schema.GroupVersion],
	gvrToGVKMap cmap.ConcurrentMap[schema.GroupVersionResource, schema.GroupVersionKind],
) {
	// if kind is empty, we are dealing with a server group and version only, not a resource.
	if len(gvk.Kind) == 0 {
		in.addGroupVersionTo(gvk.GroupVersion(), gvSet)
		return
	}

	in.addGroupVersionKindTo(gvk, gvkSet)
	in.addGroupVersionResourceTo(gvk, gvrSet, gvrToGVKMap)
	in.addGroupVersionTo(gvk.GroupVersion(), gvSet)
}

func (in *cache) addGroupVersionTo(groupVersion schema.GroupVersion, gvCacheSet containers.Set[schema.GroupVersion]) {
	in.cacheMu.RLock()
	if gvCacheSet.Has(groupVersion) {
		in.cacheMu.RUnlock()
		return
	}
	in.cacheMu.RUnlock()

	in.cacheMu.Lock()
	gvCacheSet.Add(groupVersion)
	in.cacheMu.Unlock()
}

func (in *cache) addGroupVersionKindTo(gvk schema.GroupVersionKind, gvkSet containers.Set[schema.GroupVersionKind]) {
	in.cacheMu.RLock()
	if gvkSet.Has(gvk) {
		in.cacheMu.RUnlock()
		return
	}
	in.cacheMu.RUnlock()

	in.cacheMu.Lock()
	gvkSet.Add(gvk)
	in.cacheMu.Unlock()
}

func (in *cache) addGroupVersionResourceTo(gvk schema.GroupVersionKind, gvrSet containers.Set[schema.GroupVersionResource],
	gvrToGVKMap cmap.ConcurrentMap[schema.GroupVersionResource, schema.GroupVersionKind]) {
	gvr, err := in.toGroupVersionResource(gvk)
	if err != nil {
		klog.V(log.LogLevelExtended).ErrorS(err, "unable to map gvk to gvr", "gvk", gvk)
		return
	}

	in.cacheMu.RLock()
	if gvrSet.Has(gvr) {
		in.cacheMu.RUnlock()
		return
	}
	in.cacheMu.RUnlock()

	in.cacheMu.Lock()
	gvrSet.Add(gvr)
	gvrToGVKMap.Set(gvr, gvk)
	in.cacheMu.Unlock()
}

func (in *cache) hasGroupVersion(groupVersion schema.GroupVersion) bool {
	for _, entry := range in.gvkCache.List() {
		if entry.GroupVersion() == groupVersion {
			return true
		}
	}

	return false
}

type CacheOption func(*cache)

func WithOnGroupVersionAdded(f ...GroupVersionUpdateFunc) CacheOption {
	return func(in *cache) {
		in.onGroupVersionAdded = append(in.onGroupVersionAdded, f...)
	}
}

func WithOnGroupVersionDeleted(f ...GroupVersionUpdateFunc) CacheOption {
	return func(in *cache) {
		in.onGroupVersionDeleted = append(in.onGroupVersionDeleted, f...)
	}
}

func WithOnGroupVersionKindAdded(f ...GroupVersionKindUpdateFunc) CacheOption {
	return func(in *cache) {
		in.onGroupVersionKindAdded = append(in.onGroupVersionKindAdded, f...)
	}
}

func WithOnGroupVersionKindDeleted(f ...GroupVersionKindUpdateFunc) CacheOption {
	return func(in *cache) {
		in.onGroupVersionKindDeleted = append(in.onGroupVersionKindDeleted, f...)
	}
}

func WithOnGroupVersionResourceAdded(f ...GroupVersionResourceUpdateFunc) CacheOption {
	return func(in *cache) {
		in.onGroupVersionResourceAdded = append(in.onGroupVersionResourceAdded, f...)
	}
}

func WithOnGroupVersionResourceDeleted(f ...GroupVersionResourceUpdateFunc) CacheOption {
	return func(in *cache) {
		in.onGroupVersionResourceDeleted = append(in.onGroupVersionResourceDeleted, f...)
	}
}

func NewCache(client discovery.DiscoveryInterface, mapper meta.RESTMapper, option ...CacheOption) Cache {
	result := &cache{
		client:                        client,
		mapper:                        mapper,
		gvkCache:                      containers.NewSet[schema.GroupVersionKind](),
		gvrCache:                      containers.NewSet[schema.GroupVersionResource](),
		gvCache:                       containers.NewSet[schema.GroupVersion](),
		gvrToGVKCache:                 cmap.NewStringer[schema.GroupVersionResource, schema.GroupVersionKind](),
		onGroupVersionAdded:           make([]GroupVersionUpdateFunc, 0),
		onGroupVersionDeleted:         make([]GroupVersionUpdateFunc, 0),
		onGroupVersionKindAdded:       make([]GroupVersionKindUpdateFunc, 0),
		onGroupVersionKindDeleted:     make([]GroupVersionKindUpdateFunc, 0),
		onGroupVersionResourceAdded:   make([]GroupVersionResourceUpdateFunc, 0),
		onGroupVersionResourceDeleted: make([]GroupVersionResourceUpdateFunc, 0),
	}

	for _, opt := range option {
		opt(result)
	}

	return result
}

var (
	globalCache      Cache = nil
	globalCacheMutex sync.RWMutex
)

func InitGlobalDiscoveryCache(client discovery.DiscoveryInterface, mapper meta.RESTMapper, option ...CacheOption) {
	globalCacheMutex.Lock()
	defer globalCacheMutex.Unlock()

	if globalCache != nil {
		return
	}

	globalCache = NewCache(client, mapper, option...)
}

func GlobalCache() Cache {
	globalCacheMutex.RLock()
	defer globalCacheMutex.RUnlock()

	if globalCache == nil {
		klog.Fatalf("global discovery cache is not initialized, call InitGlobalDiscoveryCache first")
	}

	return globalCache
}
