package common

import (
	"testing"

	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
)

func TestHasPhase(t *testing.T) {
	tests := []struct {
		name        string
		annotations map[string]string
		phase       SyncPhase
		want        bool
	}{
		{
			name:        "no annotations - defaults to sync phase",
			annotations: nil,
			phase:       SyncPhaseSync,
			want:        true,
		},
		{
			name:        "no annotations - not in pre-sync phase",
			annotations: nil,
			phase:       SyncPhasePreSync,
			want:        false,
		},
		{
			name:        "no annotations - not in post-sync phase",
			annotations: nil,
			phase:       SyncPhasePostSync,
			want:        false,
		},
		{
			name:        "has pre-sync annotation",
			annotations: map[string]string{SyncPhaseAnnotation: "pre-sync"},
			phase:       SyncPhasePreSync,
			want:        true,
		},
		{
			name:        "has pre-sync annotation - not in sync phase",
			annotations: map[string]string{SyncPhaseAnnotation: "pre-sync"},
			phase:       SyncPhaseSync,
			want:        false,
		},
		{
			name:        "has sync annotation",
			annotations: map[string]string{SyncPhaseAnnotation: "sync"},
			phase:       SyncPhaseSync,
			want:        true,
		},
		{
			name:        "has post-sync annotation",
			annotations: map[string]string{SyncPhaseAnnotation: "post-sync"},
			phase:       SyncPhasePostSync,
			want:        true,
		},
		{
			name:        "has sync-fail annotation",
			annotations: map[string]string{SyncPhaseAnnotation: "sync-fail"},
			phase:       SyncPhaseSyncFail,
			want:        true,
		},
		{
			name:        "has skip annotation",
			annotations: map[string]string{SyncPhaseAnnotation: "skip"},
			phase:       SyncPhaseSkip,
			want:        true,
		},
		{
			name:        "multiple phases with spaces",
			annotations: map[string]string{SyncPhaseAnnotation: "pre-sync, sync, post-sync"},
			phase:       SyncPhasePreSync,
			want:        true,
		},
		{
			name:        "multiple phases without spaces",
			annotations: map[string]string{SyncPhaseAnnotation: "pre-sync,sync,post-sync"},
			phase:       SyncPhasePostSync,
			want:        true,
		},
		{
			name:        "helm post-install hook",
			annotations: map[string]string{HelmHookAnnotation: "post-install"},
			phase:       SyncPhasePostSync,
			want:        true,
		},
		{
			name:        "helm post-upgrade hook",
			annotations: map[string]string{HelmHookAnnotation: "post-upgrade"},
			phase:       SyncPhasePostSync,
			want:        true,
		},
		{
			name:        "helm multiple hooks with spaces",
			annotations: map[string]string{HelmHookAnnotation: "pre-install, pre-upgrade"},
			phase:       SyncPhasePreSync,

			want: true,
		},
		{
			name:        "helm multiple hooks without spaces",
			annotations: map[string]string{HelmHookAnnotation: "post-install,post-upgrade"},
			phase:       SyncPhasePostSync,

			want: true,
		},
		{
			name:        "empty annotations map - defaults to sync phase",
			annotations: map[string]string{},
			phase:       SyncPhaseSync,
			want:        true,
		},
		{
			name:        "empty annotations map - not in pre-sync phase",
			annotations: map[string]string{},
			phase:       SyncPhasePreSync,
			want:        false,
		},
		{
			name: "sync-phase annotation takes precedence over helm annotation",
			annotations: map[string]string{
				SyncPhaseAnnotation: "sync",
				HelmHookAnnotation:  "pre-install",
			},
			phase: SyncPhaseSync,
			want:  true,
		},
		{
			name: "sync-phase annotation takes precedence - helm hook should not match",
			annotations: map[string]string{
				SyncPhaseAnnotation: "sync",
				HelmHookAnnotation:  "pre-install",
			},
			phase: SyncPhasePreSync,
			want:  false,
		},
		{
			name: "helm pre-install hook - should not match sync phase",
			annotations: map[string]string{
				HelmHookAnnotation: "pre-install",
			},
			phase: SyncPhaseSync,
			want:  false,
		},
		{
			name:        "invalid helm hook is not recognized",
			annotations: map[string]string{HelmHookAnnotation: "invalid-hook"},
			phase:       SyncPhaseSync,
			want:        false,
		},
		{
			name:        "no helm hook is not recognized",
			annotations: map[string]string{HelmHookAnnotation: ""},
			phase:       SyncPhaseSync,
			want:        false,
		},
		{
			name:        "invalid sync phase is not recognized",
			annotations: map[string]string{SyncPhaseAnnotation: "invalid-phase"},
			phase:       SyncPhaseSync,
			want:        false,
		},
		{
			name:        "no sync phase is not recognized",
			annotations: map[string]string{SyncPhaseAnnotation: ""},
			phase:       SyncPhaseSync,
			want:        false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			u := unstructured.Unstructured{}
			if tt.annotations != nil {
				u.SetAnnotations(tt.annotations)
			}

			got := HasPhase(u, tt.phase)
			if got != tt.want {
				t.Errorf("HasPhase() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestHasApplyPhase(t *testing.T) {
	tests := []struct {
		name        string
		annotations map[string]string
		want        bool
	}{
		{
			name:        "no annotations - defaults to apply phase",
			annotations: nil,
			want:        true,
		},
		{
			name:        "empty annotations map - defaults to apply phase",
			annotations: map[string]string{},
			want:        true,
		},
		{
			name:        "has pre-sync annotation - can be applied",
			annotations: map[string]string{SyncPhaseAnnotation: "pre-sync"},
			want:        true,
		},
		{
			name:        "has sync annotation - can be applied",
			annotations: map[string]string{SyncPhaseAnnotation: "sync"},
			want:        true,
		},
		{
			name:        "has post-sync annotation - can be applied",
			annotations: map[string]string{SyncPhaseAnnotation: "post-sync"},
			want:        true,
		},
		{
			name:        "has sync-fail annotation - can be applied",
			annotations: map[string]string{SyncPhaseAnnotation: "sync-fail"},
			want:        true,
		},
		{
			name:        "has skip annotation - cannot be applied",
			annotations: map[string]string{SyncPhaseAnnotation: "skip"},
			want:        false,
		},
		{
			name:        "invalid phase - cannot be applied",
			annotations: map[string]string{SyncPhaseAnnotation: "invalid-phase"},
			want:        false,
		},
		{
			name:        "empty sync phase - cannot be applied",
			annotations: map[string]string{SyncPhaseAnnotation: ""},
			want:        false,
		},
		{
			name:        "multiple phases with spaces - can be applied",
			annotations: map[string]string{SyncPhaseAnnotation: "pre-sync, sync, post-sync"},
			want:        true,
		},
		{
			name:        "multiple phases without spaces - can be applied",
			annotations: map[string]string{SyncPhaseAnnotation: "pre-sync,sync,post-sync"},
			want:        true,
		},
		{
			name:        "skip with other phases - can be applied",
			annotations: map[string]string{SyncPhaseAnnotation: "skip,sync"},
			want:        true,
		},
		{
			name:        "helm pre-install hook - can be applied",
			annotations: map[string]string{HelmHookAnnotation: "pre-install"},
			want:        true,
		},
		{
			name:        "helm post-install hook - can be applied",
			annotations: map[string]string{HelmHookAnnotation: "post-install"},
			want:        true,
		},
		{
			name:        "helm pre-upgrade hook - can be applied",
			annotations: map[string]string{HelmHookAnnotation: "pre-upgrade"},
			want:        true,
		},
		{
			name:        "helm post-upgrade hook - can be applied",
			annotations: map[string]string{HelmHookAnnotation: "post-upgrade"},
			want:        true,
		},
		{
			name:        "helm multiple hooks with spaces - can be applied",
			annotations: map[string]string{HelmHookAnnotation: "pre-install, post-install"},
			want:        true,
		},
		{
			name:        "helm multiple hooks without spaces - can be applied",
			annotations: map[string]string{HelmHookAnnotation: "pre-install,post-install"},
			want:        true,
		},
		{
			name:        "invalid helm hook - cannot be applied",
			annotations: map[string]string{HelmHookAnnotation: "test"},
			want:        false,
		},
		{
			name:        "not supported helm hook - cannot be applied",
			annotations: map[string]string{HelmHookAnnotation: "pre-delete"},
			want:        false,
		},
		{
			name: "not supported helm hook taken from live resource - cannot be applied",
			annotations: map[string]string{
				"helm.sh/hook":                      "pre-delete",
				"helm.sh/hook-delete-policy":        "before-hook-creation",
				"helm.sh/hook-weight":               "-3",
				"meta.helm.sh/release-name":         "vm-agent",
				"meta.helm.sh/release-namespace":    "monitoring",
				"config.k8s.io/owning-inventory":    "da500103-e6a6-42e5-a477-c04c030024eb",
				"config.k8s.io/tracking-identifier": "batch/v1/Job/monitoring/vm-agent-victoria-metrics-operator-cleanup-hook",
				"config.kubernetes.io/index":        "104",
			},
			want: false,
		},
		{
			name:        "empty helm hook - cannot be applied",
			annotations: map[string]string{HelmHookAnnotation: ""},
			want:        false,
		},
		{
			name: "sync-phase annotation takes precedence over helm annotation",
			annotations: map[string]string{
				SyncPhaseAnnotation: "sync",
				HelmHookAnnotation:  "test",
			},
			want: true,
		},
		{
			name: "sync-phase skip takes precedence over helm annotation",
			annotations: map[string]string{
				SyncPhaseAnnotation: "skip",
				HelmHookAnnotation:  "pre-install",
			},
			want: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			u := unstructured.Unstructured{}
			if tt.annotations != nil {
				u.SetAnnotations(tt.annotations)
			}

			got := HasApplyPhase(u)
			if got != tt.want {
				t.Errorf("HasApplyPhase() = %v, want %v", got, tt.want)
			}
		})
	}
}
