package common

import (
	"strings"

	"github.com/pluralsh/console/go/polly/containers"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
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
	options := strings.ToLower(strings.ReplaceAll(annotation, " ", ""))
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

func HasResyncInProgressAnnotation(u *unstructured.Unstructured) bool {
	annotations := u.GetAnnotations()
	if annotations == nil {
		return false
	}

	_, ok := annotations[ResyncInProgressAnnotation]
	return ok
}
