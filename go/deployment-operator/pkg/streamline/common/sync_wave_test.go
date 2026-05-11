package common

import (
	"testing"

	"github.com/pluralsh/deployment-operator/pkg/common"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
)

func TestGetSyncWave(t *testing.T) {
	tests := []struct {
		name        string
		kind        string
		annotations map[string]string
		want        int
	}{
		{
			name:        "custom sync wave annotation with positive value",
			kind:        common.DeploymentKind,
			annotations: map[string]string{SyncWaveAnnotation: "10"},
			want:        10,
		},
		{
			name:        "custom sync wave annotation with negative value",
			kind:        common.DeploymentKind,
			annotations: map[string]string{SyncWaveAnnotation: "-5"},
			want:        -5,
		},
		{
			name:        "custom sync wave annotation with zero",
			kind:        common.DeploymentKind,
			annotations: map[string]string{SyncWaveAnnotation: "0"},
			want:        0,
		},
		{
			name:        "invalid sync wave falls back to helm hook weight",
			kind:        common.DeploymentKind,
			annotations: map[string]string{SyncWaveAnnotation: "invalid", HelmHookWeightAnnotation: "7"},
			want:        7,
		},
		{
			name:        "invalid sync wave and no helm hook falls back to default",
			kind:        common.DeploymentKind,
			annotations: map[string]string{SyncWaveAnnotation: "not-a-number"},
			want:        2,
		},
		{
			name:        "helm hook weight annotation when sync wave not present",
			kind:        common.StatefulSetKind,
			annotations: map[string]string{HelmHookWeightAnnotation: "15"},
			want:        15,
		},
		{
			name:        "helm hook weight with negative value",
			kind:        common.ServiceKind,
			annotations: map[string]string{HelmHookWeightAnnotation: "-3"},
			want:        -3,
		},
		{
			name:        "invalid helm hook weight falls back to default",
			kind:        common.ServiceKind,
			annotations: map[string]string{HelmHookWeightAnnotation: "abc"},
			want:        3,
		},
		{
			name:        "sync wave takes precedence over helm hook weight",
			kind:        common.DeploymentKind,
			annotations: map[string]string{SyncWaveAnnotation: "5", HelmHookWeightAnnotation: "10"},
			want:        5,
		},
		{
			name:        "no annotations - unknown kind uses default",
			kind:        "UnknownKind",
			annotations: nil,
			want:        SyncWaveDefault,
		},
		{
			name:        "empty annotations map - falls back to default",
			kind:        common.DeploymentKind,
			annotations: map[string]string{},
			want:        2,
		},
		{
			name:        "sync wave with large positive value",
			kind:        common.DeploymentKind,
			annotations: map[string]string{SyncWaveAnnotation: "1000"},
			want:        1000,
		},
		{
			name:        "sync wave with large negative value",
			kind:        common.DeploymentKind,
			annotations: map[string]string{SyncWaveAnnotation: "-1000"},
			want:        -1000,
		},
		{
			name:        "argocd sync wave annotation with positive value",
			kind:        common.DeploymentKind,
			annotations: map[string]string{ArgoSyncWaveAnnotation: "8"},
			want:        8,
		},
		{
			name:        "argocd sync wave annotation with negative value",
			kind:        common.ServiceKind,
			annotations: map[string]string{ArgoSyncWaveAnnotation: "-2"},
			want:        -2,
		},
		{
			name:        "argocd sync wave annotation with zero",
			kind:        common.StatefulSetKind,
			annotations: map[string]string{ArgoSyncWaveAnnotation: "0"},
			want:        0,
		},
		{
			name:        "invalid argocd sync wave falls back to helm hook weight",
			kind:        common.DeploymentKind,
			annotations: map[string]string{ArgoSyncWaveAnnotation: "invalid", HelmHookWeightAnnotation: "6"},
			want:        6,
		},
		{
			name:        "invalid argocd sync wave and no helm hook falls back to default",
			kind:        common.DeploymentKind,
			annotations: map[string]string{ArgoSyncWaveAnnotation: "not-valid"},
			want:        2,
		},
		{
			name:        "argocd sync wave takes precedence over helm hook weight",
			kind:        common.ServiceKind,
			annotations: map[string]string{ArgoSyncWaveAnnotation: "12", HelmHookWeightAnnotation: "5"},
			want:        12,
		},
		{
			name:        "custom sync wave takes precedence over argocd sync wave",
			kind:        common.DeploymentKind,
			annotations: map[string]string{SyncWaveAnnotation: "3", ArgoSyncWaveAnnotation: "20"},
			want:        3,
		},
		{
			name:        "custom sync wave takes precedence over argocd and helm",
			kind:        common.DaemonSetKind,
			annotations: map[string]string{SyncWaveAnnotation: "1", ArgoSyncWaveAnnotation: "10", HelmHookWeightAnnotation: "5"},
			want:        1,
		},
		{
			name:        "argocd sync wave with large positive value",
			kind:        common.JobKind,
			annotations: map[string]string{ArgoSyncWaveAnnotation: "500"},
			want:        500,
		},
		{
			name:        "argocd sync wave with large negative value",
			kind:        common.CronJobKind,
			annotations: map[string]string{ArgoSyncWaveAnnotation: "-100"},
			want:        -100,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			u := unstructured.Unstructured{}
			u.SetKind(tt.kind)
			if tt.annotations != nil {
				u.SetAnnotations(tt.annotations)
			}

			got := GetSyncWave(u)
			if got != tt.want {
				t.Errorf("GetSyncWave() = %v, want %v", got, tt.want)
			}
		})
	}
}
