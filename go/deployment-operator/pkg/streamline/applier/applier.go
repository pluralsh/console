package applier

import (
	"context"
	"time"

	"github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/polly/containers"
	"github.com/samber/lo"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/client-go/dynamic"
	"k8s.io/klog/v2"

	"github.com/pluralsh/deployment-operator/internal/helpers"
	discoverycache "github.com/pluralsh/deployment-operator/pkg/cache/discovery"
	"github.com/pluralsh/deployment-operator/pkg/log"
	smcommon "github.com/pluralsh/deployment-operator/pkg/streamline/common"
	"github.com/pluralsh/deployment-operator/pkg/streamline/store"
)

type Applier struct {
	filters        *FilterEngine
	client         dynamic.Interface
	discoveryCache discoverycache.Cache
	store          store.Store
	waveDelay      time.Duration

	// onApply callback is called after each resource is applied
	onApply func(unstructured.Unstructured)
}

func (in *Applier) skipResource(resource unstructured.Unstructured, dryRun bool) bool {
	return !in.filters.MatchOmit(resource, lo.Ternary(dryRun, []Filter{FilterCache}, []Filter{})...)
}

func (in *Applier) Apply(ctx context.Context,
	service client.ServiceDeploymentForAgent,
	resources []unstructured.Unstructured,
	opts ...WaveProcessorOption,
) ([]client.ComponentAttributes, []client.ServiceErrorAttributes, error) {
	resources = in.ensureServiceAnnotation(resources, service.ID)

	if err := in.store.SyncServiceComponents(service.ID, resources); err != nil {
		return nil, nil, err
	}

	deleteFilterFunc, err := in.getDeleteFilterFunc(service.ID)
	if err != nil {
		return nil, nil, err
	}

	phases := NewPhases(
		resources,
		func(resource unstructured.Unstructured) bool {
			return in.skipResource(resource, lo.FromPtr(service.DryRun))
		},
		func(resources []unstructured.Unstructured) (toApply, toDelete []unstructured.Unstructured) {
			return deleteFilterFunc(resources)
		},
	)

	var failed bool
	var syncPhase *smcommon.SyncPhase
	var phase *Phase
	var hasOnFailPhase bool
	serviceErrorList := make([]client.ServiceErrorAttributes, 0)
	for {
		if phase, hasOnFailPhase = phases.Next(syncPhase, failed); phase == nil {
			break
		}

		now := time.Now()
		syncPhase = lo.ToPtr(phase.Name())

		if !phase.HasWaves() {
			klog.V(log.LogLevelDefault).InfoS(
				"apply result",
				"service", service.Name,
				"id", service.ID,
				"phase", phase.Name(),
				"resources", phase.ResourceCount(),
				"skipped", len(phase.Skipped()),
				"applied", "0/0",
				"deleted", "0/0",
				"dryRun", lo.FromPtr(service.DryRun),
				"duration", time.Since(now),
			)

			continue
		}

		waves := phase.Waves()
		waveStatistics := WaveStatistics{}
		for i, wave := range waves {
			processor := NewWaveProcessor(in.client, in.discoveryCache, phase.Name(), wave, opts...)
			_, serviceErrors := processor.Run(ctx)

			serviceErrorList = append(serviceErrorList, serviceErrors...)

			waveStatistics.Add(processor.Statistics())

			if i < len(waves)-1 {
				time.Sleep(in.waveDelay)
			}
		}

		klog.V(log.LogLevelDefault).InfoS(
			"apply result",
			"service", service.Name,
			"id", service.ID,
			"phase", phase.Name(),
			"resources", phase.ResourceCount(),
			"skipped", phase.SkippedCount(),
			"applied", waveStatistics.Applied(),
			"deleted", waveStatistics.Deleted(),
			"dryRun", lo.FromPtr(service.DryRun),
			"duration", time.Since(now),
		)

		if !phases.HasResourcesInFollowingPhases(syncPhase) {
			klog.V(log.LogLevelTrace).InfoS("no more resources to be applied", "service", service.Name)
			break
		}

		hasPendingResources, hasFailedResources, err := phase.ResourceHealth()
		if err != nil {
			klog.V(log.LogLevelDefault).ErrorS(err, "failed to get phase health", "phase", phase.Name())
			break
		}

		if hasPendingResources {
			serviceErrorList = append(serviceErrorList, client.ServiceErrorAttributes{
				Source:  string(phase.Name()),
				Message: "waiting for resources to be ready",
				Warning: lo.ToPtr(true),
			})
			klog.V(log.LogLevelTrace).InfoS("waiting for resources to be ready", "phase", phase.Name())
			break
		}

		failed = hasFailedResources ||
			lo.ContainsBy(serviceErrorList, func(e client.ServiceErrorAttributes) bool { return !lo.FromPtr(e.Warning) })
		if failed {
			serviceErrorList = append(serviceErrorList, client.ServiceErrorAttributes{
				Source:  string(phase.Name()),
				Message: "could not complete phase, check errors and failing resources",
			})
			if !hasOnFailPhase {
				klog.V(log.LogLevelTrace).InfoS("failed to apply phase", "phase", phase.Name())
				break
			}
		}
	}

	attrs, err := in.store.GetComponentAttributes(service.ID, false)
	return attrs, serviceErrorList, err
}

func (in *Applier) Destroy(ctx context.Context, serviceID string) ([]client.ComponentAttributes, error) {
	deleted := 0
	deleteFilterFunc, err := in.getDeleteFilterFunc(serviceID)
	if err != nil {
		return nil, err
	}

	toDelete, _ := deleteFilterFunc([]unstructured.Unstructured{})
	for _, resource := range toDelete {
		live, err := in.client.Resource(helpers.GVRFromGVK(resource.GroupVersionKind())).Namespace(resource.GetNamespace()).Get(ctx, resource.GetName(), metav1.GetOptions{})
		if errors.IsNotFound(err) {
			if err := in.store.DeleteComponent(smcommon.NewStoreKeyFromUnstructured(resource)); err != nil {
				klog.V(log.LogLevelDefault).ErrorS(err, "failed to delete component from store", "resource", resource.GetUID())
			}
			continue
		}
		if err != nil {
			return nil, err
		}

		if live.GetAnnotations() != nil && live.GetAnnotations()[smcommon.LifecycleDeleteAnnotation] == smcommon.PreventDeletion {
			if err := in.store.DeleteComponent(smcommon.NewStoreKeyFromUnstructured(lo.FromPtr(live))); err != nil {
				klog.V(log.LogLevelDefault).ErrorS(err, "failed to delete component from store", "resource", live.GetUID())
			}

			// Delete service ID annotation so it will not be synced to store.
			annotations := live.GetAnnotations()
			delete(annotations, smcommon.OwningInventoryKey)
			live.SetAnnotations(annotations)
			if _, err := in.client.Resource(helpers.GVRFromGVK(live.GroupVersionKind())).
				Update(ctx, live, metav1.UpdateOptions{}); err != nil {
				return nil, err
			}

			continue
		}

		err = in.client.
			Resource(helpers.GVRFromGVK(live.GroupVersionKind())).
			Namespace(live.GetNamespace()).Delete(ctx, live.GetName(), metav1.DeleteOptions{
			GracePeriodSeconds: lo.ToPtr(int64(0)),
			PropagationPolicy:  lo.ToPtr(metav1.DeletePropagationBackground),
		})
		if errors.IsNotFound(err) {
			if err := in.store.DeleteComponent(smcommon.NewStoreKeyFromUnstructured(lo.FromPtr(live))); err != nil {
				klog.V(log.LogLevelDefault).ErrorS(err, "failed to delete component from store", "resource", live.GetUID())
			}
			continue
		}
		if err != nil {
			return nil, err
		}

		deleted++
	}

	defer klog.V(log.LogLevelDefault).InfoS("deleted service components", "deleted", deleted, "service", serviceID)
	return in.store.GetComponentAttributes(serviceID, true)
}

func (in *Applier) ensureServiceAnnotation(resources []unstructured.Unstructured, serviceID string) []unstructured.Unstructured {
	for _, obj := range resources {
		annotations := obj.GetAnnotations()
		if annotations == nil {
			annotations = make(map[string]string)
		}

		annotations[smcommon.OwningInventoryKey] = serviceID
		annotations[smcommon.TrackingIdentifierKey] = smcommon.NewKeyFromUnstructured(obj).String()
		obj.SetAnnotations(annotations)
	}

	return resources
}

var (
	mirrorGroups = map[string]string{
		"authorization.openshift.io": "rbac.authorization.k8s.io",
		"rbac.authorization.k8s.io":  "authorization.openshift.io",
	}
)

func (in *Applier) getDeleteFilterFunc(serviceID string) (func(resources []unstructured.Unstructured) (toDelete []unstructured.Unstructured, toApply []unstructured.Unstructured), error) {
	components, err := in.store.GetServiceComponents(serviceID, true)
	if err != nil {
		return nil, err
	}

	componentsSet := containers.NewSet[smcommon.Key]()
	for _, component := range components {
		componentsSet.Add(component.StoreKey().VersionlessKey())
	}

	hooks, err := in.store.GetHookComponents(serviceID)
	if err != nil {
		return nil, err
	}

	// Create a map of hooks for an easy lookup.
	keyToHookComponent := make(map[smcommon.Key]smcommon.HookComponent)
	for _, hook := range hooks {
		keyToHookComponent[hook.StoreKey().VersionlessKey()] = hook
	}

	return func(resources []unstructured.Unstructured) (toDelete []unstructured.Unstructured, toApply []unstructured.Unstructured) {
		skipApply := containers.NewSet[smcommon.Key]()

		// Create a map of resources for an easy lookup.
		keyToResource := make(map[smcommon.Key]unstructured.Unstructured)
		for _, obj := range resources {
			key := smcommon.NewStoreKeyFromUnstructured(obj).VersionlessKey()
			keyToResource[key] = obj
		}

		for _, component := range components {
			entryKey := component.StoreKey()
			toCheck := []smcommon.Key{entryKey.VersionlessKey()}
			if mirrorGroup, ok := mirrorGroups[component.Group]; ok {
				toCheck = append(toCheck, entryKey.ReplaceGroup(mirrorGroup).VersionlessKey())
			}

			if shouldKeep := lo.SomeBy(toCheck, func(key smcommon.Key) bool {
				_, ok := keyToResource[key]
				return ok
			}); !shouldKeep {
				toDelete = append(toDelete, component.DeletableUnstructured()) // Ensures annotations that are checked later in NewPhase func.
				skipApply.Add(entryKey.VersionlessKey())
			}
		}

		for key, resource := range keyToResource {
			// If the resource:
			// - is in our hook component store,
			// - has reached its desired state according to the delete policies,
			// - and has not changed manifest recently;
			// Then we can skip applying it and ensure that these resources are deleted.
			deletePolicies := smcommon.ParseHookDeletePolicy(resource)
			hook, ok := keyToHookComponent[key]
			if ok && hook.HasDesiredState(deletePolicies) && !hook.HasManifestChanged(resource) {
				skipApply.Add(key)

				if componentsSet.Has(key) {
					toDelete = append(toDelete, resource)
				}

				continue
			}

			// Skip applying hook resource if their manifest did not change, and it has reached its desired state.
			if ok && !hook.HasManifestChanged(resource) && hook.HadDesiredState() {
				skipApply.Add(key)

				continue
			}

			// Apply resources if they were not marked to be skipped.
			if !skipApply.Has(key) {
				toApply = append(toApply, resource)
			}
		}

		return
	}, nil
}

type Option func(*Applier)

func WithWaveDelay(d time.Duration) Option {
	return func(a *Applier) {
		a.waveDelay = d
	}
}

func WithFilter(name Filter, f FilterFunc) Option {
	return func(a *Applier) {
		a.filters.Add(name, f)
	}
}

func WithOnApply(f func(unstructured.Unstructured)) Option {
	return func(a *Applier) {
		a.onApply = f
	}
}

func NewApplier(client dynamic.Interface, discoveryCache discoverycache.Cache, store store.Store, opts ...Option) *Applier {
	result := &Applier{
		discoveryCache: discoveryCache,
		client:         client,
		store:          store,
		filters:        NewFilterEngine(),
		waveDelay:      1 * time.Second,
	}

	for _, opt := range opts {
		opt(result)
	}

	return result
}
