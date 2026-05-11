package common

import (
	"strconv"

	"github.com/pluralsh/deployment-operator/pkg/common"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
)

const (
	// SyncWaveAnnotation allows users to customize resource apply ordering when needed.
	SyncWaveAnnotation = "deployment.plural.sh/sync-wave"

	// ArgoSyncWaveAnnotation indicates which wave of the sync the resource or hook should be in.
	ArgoSyncWaveAnnotation = "argocd.argoproj.io/sync-wave"

	// HelmHookWeightAnnotation is the annotation key used to store the Helm hook weight.
	HelmHookWeightAnnotation = "helm.sh/hook-weight"

	// SyncWaveDefault should be after the last priority from kindSyncPriorities.
	SyncWaveDefault = 4
)

var kindSyncPriorities = map[string]int{
	// Core non-namespaced resources.
	common.NamespaceKind:                0,
	common.CustomResourceDefinitionKind: 0,
	common.PersistentVolumeKind:         0,
	common.ClusterRoleKind:              0,
	common.ClusterRoleListKind:          0,
	common.ClusterRoleBindingKind:       0,
	common.ClusterRoleBindingListKind:   0,
	common.StorageClassKind:             0,

	// Core namespaced configuration resources.
	common.ConfigMapKind:             1,
	common.SecretKind:                1,
	common.SecretListKind:            1,
	common.ServiceAccountKind:        1,
	common.RoleKind:                  1,
	common.RoleListKind:              1,
	common.RoleBindingKind:           1,
	common.RoleBindingListKind:       1,
	common.PodDisruptionBudgetKind:   1,
	common.ResourceQuotaKind:         1,
	common.NetworkPolicyKind:         1,
	common.LimitRangeKind:            1,
	common.PodSecurityPolicyKind:     1,
	common.IngressClassKind:          1,
	common.PersistentVolumeClaimKind: 1,

	// Core namespaced workload resources.
	common.DeploymentKind:            2,
	common.DaemonSetKind:             2,
	common.StatefulSetKind:           2,
	common.ReplicaSetKind:            2,
	common.JobKind:                   2,
	common.CronJobKind:               2,
	common.PodKind:                   2,
	common.ReplicationControllerKind: 2,

	// Core namespaced networking resources.
	common.EndpointsKind:  3,
	common.ServiceKind:    3,
	common.IngressKind:    3,
	common.APIServiceKind: 3,
}

// GetSyncWave retrieves the sync wave from the resource annotations.
func GetSyncWave(u unstructured.Unstructured) int {
	annotations := u.GetAnnotations()
	if annotations == nil {
		return defaultWave(u.GetKind())
	}

	wave, ok := annotations[SyncWaveAnnotation]
	if !ok {
		return argoWave(annotations, u.GetKind())
	}

	i, err := strconv.Atoi(wave)
	if err != nil {
		return argoWave(annotations, u.GetKind())
	}

	return i
}

// argoWave discovers which wave of the sync the resource or hook should be in.
func argoWave(annotations map[string]string, kind string) int {
	wave, ok := annotations[ArgoSyncWaveAnnotation]
	if !ok {
		return helmWave(annotations, kind)
	}

	i, err := strconv.Atoi(wave)
	if err != nil {
		return helmWave(annotations, kind)
	}

	return i
}

// helmWave retrieves the helm hook weight from the resource annotations.
func helmWave(annotations map[string]string, kind string) int {
	wave, ok := annotations[HelmHookWeightAnnotation]
	if !ok {
		return defaultWave(kind)
	}

	i, err := strconv.Atoi(wave)
	if err != nil {
		return defaultWave(kind)
	}

	return i
}

// defaultWave returns default sync wave for a resource based on its kind.
// If the sync wave was not defined for a kind, it returns the last default wave.
func defaultWave(kind string) int {
	i, ok := kindSyncPriorities[kind]
	if !ok {
		return SyncWaveDefault
	}

	return i
}
