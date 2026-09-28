package common

import (
	"strings"

	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"

	"github.com/pluralsh/console/go/polly/containers"
)

const (
	// SyncOptionsAnnotation specifies sync options for a given resource.
	SyncOptionsAnnotation = "deployment.plural.sh/sync-options"

	// ArgoSyncOptionsAnnotation specifies sync options for a given resource.
	ArgoSyncOptionsAnnotation = "argocd.argoproj.io/sync-options"

	// SyncOptionForce escalates a failed sync to delete and recreate.
	// If replace=true is also set, escalation happens when replace fails.
	SyncOptionForce = "force=true"

	// SyncOptionReplace uses replace instead of apply.
	// It removes fields missing from the desired state.
	// With force=true, a failed replace escalates to delete and recreate.
	SyncOptionReplace = "replace=true"

	// SyncOptionPruneDisabled skips deletion of resources removed from the desired state.
	SyncOptionPruneDisabled = "prune=false"

	// SyncOptionDeleteDisabled skips deletion of resources when a service is destroyed.
	SyncOptionDeleteDisabled = "delete=false"

	// SyncOptionDetach retains a resource while removing its association with the service.
	SyncOptionDetach = "detach"

	// ResyncInProgressAnnotation contains an annotation for a resource that was deleted forcefully
	// and will be recreated in the next reconciling.
	ResyncInProgressAnnotation = "deployment.plural.sh/resync"
)

// getSyncOptions returns the sync options of a resource.
func getSyncOptions(u unstructured.Unstructured) containers.Set[string] {
	annotations := u.GetAnnotations()
	if annotations == nil {
		return nil
	}

	annotation, ok := annotations[SyncOptionsAnnotation]
	if !ok {
		return getArgoSyncOptions(annotations)
	}

	return parseSyncOptions(annotation)
}

func getArgoSyncOptions(annotations map[string]string) containers.Set[string] {
	annotation, ok := annotations[ArgoSyncOptionsAnnotation]
	if !ok {
		return nil
	}

	return parseSyncOptions(annotation)
}

func parseSyncOptions(annotation string) containers.Set[string] {
	options := strings.ToLower(strings.Join(strings.Fields(annotation), ""))
	return containers.ToSet(strings.Split(options, ","))
}

func HasSyncOption(u unstructured.Unstructured, option string) bool {
	options := getSyncOptions(u)
	if options == nil {
		return false
	}

	return options.Has(option)
}

func HasForceSyncOption(u unstructured.Unstructured) bool {
	return HasSyncOption(u, SyncOptionForce)
}

func HasReplaceSyncOption(u unstructured.Unstructured) bool {
	return HasSyncOption(u, SyncOptionReplace)
}

// HasPruneDisabledSyncOption reports whether a resource should be kept when it is removed from the desired state.
func HasPruneDisabledSyncOption(u unstructured.Unstructured) bool {
	return HasSyncOption(u, SyncOptionPruneDisabled)
}

// HasDeleteDisabledSyncOption reports whether a resource should be kept when its service is destroyed.
func HasDeleteDisabledSyncOption(u unstructured.Unstructured) bool {
	return HasSyncOption(u, SyncOptionDeleteDisabled)
}

// HasDetachOption reports whether a resource should be detached from its service.
// It recognizes the legacy lifecycle annotation and Plural's sync-options annotation.
func HasDetachOption(u unstructured.Unstructured) bool {
	annotations := u.GetAnnotations()
	if annotations == nil {
		return false
	}
	if annotations[LifecycleDeleteAnnotation] == PreventDeletion {
		return true
	}

	annotation, ok := annotations[SyncOptionsAnnotation]
	if !ok {
		return false
	}

	return parseSyncOptions(annotation).Has(SyncOptionDetach)
}

func HasResyncInProgressAnnotation(u *unstructured.Unstructured) bool {
	annotations := u.GetAnnotations()
	if annotations == nil {
		return false
	}

	_, ok := annotations[ResyncInProgressAnnotation]
	return ok
}
