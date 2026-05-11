package common

import (
	"strings"

	"github.com/pluralsh/console/go/polly/containers"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
)

type SyncPhase string

func (sp SyncPhase) Equals(s string) bool {
	return sp.String() == s
}

func (sp SyncPhase) String() string {
	return string(sp)
}

const (
	// SyncPhaseAnnotation allows users to customize resource apply phases when needed.
	SyncPhaseAnnotation = "deployment.plural.sh/sync-hook"

	// SyncPhasePreSync is the earliest phase that a resource can be in.
	SyncPhasePreSync SyncPhase = "pre-sync"

	// SyncPhaseSync is the default phase that a resource is in. It is applied after the PreSync phase succeeds.
	SyncPhaseSync SyncPhase = "sync"

	// SyncPhasePostSync is the latest phase that a resource can be in. It is applied after the Sync phase succeeds.
	SyncPhasePostSync SyncPhase = "post-sync"

	// SyncPhaseSyncFail is the phase applied when the Sync phase fails.
	SyncPhaseSyncFail SyncPhase = "sync-fail"

	// SyncPhaseSkip means the resource will be skipped during the sync process.
	SyncPhaseSkip SyncPhase = "skip"

	// HelmHookAnnotation is the annotation key used to store the helm hook type
	// that should be applied during specific phases of the applying lifecycle.
	HelmHookAnnotation = "helm.sh/hook"

	// HelmHookPreInstall resources are applied before the installation of resources.
	HelmHookPreInstall = "pre-install"

	// HelmHookPostInstall resources are applied after the installation of resources.
	HelmHookPostInstall = "post-install"

	// HelmHookPreUpgrade resources are applied before the upgrade of resources.
	HelmHookPreUpgrade = "pre-upgrade"

	// HelmHookPostUpgrade resources are applied after the upgrade of resources.
	HelmHookPostUpgrade = "post-upgrade"
)

// SyncPhases contains all currently supported sync phases.
var SyncPhases = []SyncPhase{
	SyncPhasePreSync,
	SyncPhaseSync,
	SyncPhasePostSync,
	SyncPhaseSyncFail,
	SyncPhaseSkip,
}

// ApplyPhases contains all phases where resources can be applied to the cluster.
var ApplyPhases = containers.ToSet([]string{
	SyncPhasePreSync.String(),
	SyncPhaseSync.String(),
	SyncPhasePostSync.String(),
	SyncPhaseSyncFail.String(),
})

var HelmApplyPhases = containers.ToSet([]string{
	HelmHookPreInstall,
	HelmHookPostInstall,
	HelmHookPreUpgrade,
	HelmHookPostUpgrade,
})

// GetDeletePhase returns the phase in which the resource should be deleted.
func GetDeletePhase(u unstructured.Unstructured) SyncPhase {
	annotations := u.GetAnnotations()
	if annotations == nil {
		return SyncPhaseSync
	}

	annotation, ok := annotations[SyncPhaseAnnotation]
	if !ok {
		return getHelmDeleteHook(annotations)
	}

	phases := containers.ToSet[string](strings.Split(strings.ReplaceAll(annotation, " ", ""), ","))
	for _, phase := range SyncPhases {
		if phases.Has(phase.String()) {
			return phase
		}
	}

	return SyncPhaseSync
}

func getHelmDeleteHook(annotations map[string]string) SyncPhase {
	annotation, ok := annotations[HelmHookAnnotation]
	if !ok {
		return SyncPhaseSync
	}

	hooks := containers.ToSet[string](strings.Split(strings.ReplaceAll(annotation, " ", ""), ","))
	if hooks.Has(HelmHookPreInstall) || hooks.Has(HelmHookPreUpgrade) {
		return SyncPhasePreSync
	}

	if hooks.Has(HelmHookPostInstall) || hooks.Has(HelmHookPostUpgrade) {
		return SyncPhasePostSync
	}

	return SyncPhaseSync
}

// HasPhase checks if the resource belongs to the specified sync phase.
func HasPhase(u unstructured.Unstructured, phase SyncPhase) bool {
	annotations := u.GetAnnotations()
	if annotations == nil {
		return phase.Equals(SyncPhaseSync.String()) // If no annotations are found, then put it in the default phase.
	}

	annotation, ok := annotations[SyncPhaseAnnotation]
	if !ok {
		return hasHelmHook(annotations, phase) // Fallback to Helm annotation check.
	}

	phases := containers.ToSet[string](strings.Split(strings.ReplaceAll(annotation, " ", ""), ","))
	return phases.Has(phase.String())
}

func hasHelmHook(annotations map[string]string, phase SyncPhase) bool {
	annotation, ok := annotations[HelmHookAnnotation]
	if !ok {
		return phase == SyncPhaseSync // If no Helm annotation is found, then put it in the default phase.
	}

	hooks := containers.ToSet[string](strings.Split(strings.ReplaceAll(annotation, " ", ""), ","))
	switch phase {
	case SyncPhasePreSync:
		return hooks.Has(HelmHookPreInstall) || hooks.Has(HelmHookPreUpgrade)
	case SyncPhasePostSync:
		return hooks.Has(HelmHookPostInstall) || hooks.Has(HelmHookPostUpgrade)
	case SyncPhaseSync:
		return hooks.Len() == 0 // If no Helm hooks are found, then put it in the default phase.
	}

	return false
}

// HasApplyPhase indicates if a resource has a phase where it can be applied to the cluster.
// Invalid phases or a skip phase will return false.
func HasApplyPhase(u unstructured.Unstructured) bool {
	annotations := u.GetAnnotations()
	if annotations == nil {
		return true // If no annotations are found, the resource is in a default phase and can be applied.
	}

	annotation, ok := annotations[SyncPhaseAnnotation]
	if !ok {
		return hasHelmApplyPhase(annotations) // Fallback to Helm annotation check.
	}

	phases := containers.ToSet[string](strings.Split(strings.ReplaceAll(annotation, " ", ""), ","))
	return len(phases.Intersect(ApplyPhases)) > 0
}

func hasHelmApplyPhase(annotations map[string]string) bool {
	annotation, ok := annotations[HelmHookAnnotation]
	if !ok {
		return true // If annotation is not found, the resource is in a default phase and can be applied.
	}

	hooks := containers.ToSet[string](strings.Split(strings.ReplaceAll(annotation, " ", ""), ","))
	return len(hooks.Intersect(HelmApplyPhases)) > 0
}
