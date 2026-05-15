package common

import (
	"strings"

	"github.com/pluralsh/console/go/polly/containers"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
)

const (
	// SyncPhaseHookDeletePolicy allows users to customize resource deletion behavior.
	SyncPhaseHookDeletePolicy = "deployment.plural.sh/sync-hook-delete-policy"

	// HelmHookDeletePolicyAnnotation allows users to customize resource deletion behavior.
	HelmHookDeletePolicyAnnotation = "helm.sh/hook-delete-policy"

	// HookDeletePolicySucceeded means the resource should be deleted if the hook succeeds.
	// Used both in SyncPhaseHookDeletePolicy and HelmHookDeletePolicyAnnotation to simplify checks.
	HookDeletePolicySucceeded = "hook-succeeded"

	// HookDeletePolicyFailed means the resource should be deleted if the hook fails.
	// Used both in SyncPhaseHookDeletePolicy and HelmHookDeletePolicyAnnotation for simplify checks.
	HookDeletePolicyFailed = "hook-failed"
)

// deletableResources contains the list of resources that can be deleted once the deletion policy desired state is met.
// We do not support deletion of resources which state becomes running immediately, i.e., roles or secrets,
// as this could prevent related resources from completing.
var deletableResources = containers.ToSet([]string{
	"v1/Pod",
	"batch/v1/Job",
})

func isDeletableResource(u unstructured.Unstructured) bool {
	return deletableResources.Has(u.GetAPIVersion() + "/" + u.GetKind())
}

func HasSyncPhaseHookDeletePolicy(u unstructured.Unstructured) bool {
	if !isDeletableResource(u) {
		return false
	}

	annotations := u.GetAnnotations()
	if annotations == nil {
		return false
	}

	if _, ok := annotations[SyncPhaseHookDeletePolicy]; ok {
		return true
	}

	_, ok := annotations[HelmHookDeletePolicyAnnotation]
	return ok
}

// GetPhaseHookDeletePolicy retrieves the sync phase hook delete policy from the resource annotations.
func GetPhaseHookDeletePolicy(u unstructured.Unstructured) string {
	if !isDeletableResource(u) {
		return ""
	}

	annotations := u.GetAnnotations()
	if annotations == nil {
		return ""
	}

	policy, ok := annotations[SyncPhaseHookDeletePolicy]
	if !ok {
		return helmHookDeletePolicy(annotations)
	}

	return policy
}

func helmHookDeletePolicy(annotations map[string]string) string {
	policy, ok := annotations[HelmHookDeletePolicyAnnotation]
	if !ok {
		return ""
	}

	return policy
}

func ParseHookDeletePolicy(resource unstructured.Unstructured) []string {
	return SplitHookDeletePolicy(GetPhaseHookDeletePolicy(resource))
}

func SplitHookDeletePolicy(policy string) []string {
	return strings.Split(strings.ReplaceAll(policy, " ", ""), ",")
}
