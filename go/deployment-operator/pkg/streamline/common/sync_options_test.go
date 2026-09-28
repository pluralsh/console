package common

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
)

func TestHasSyncOption(t *testing.T) {
	tests := []struct {
		name   string
		obj    unstructured.Unstructured
		option string
		want   bool
	}{
		{
			name:   "no annotations",
			obj:    unstructured.Unstructured{},
			option: SyncOptionForce,
			want:   false,
		},
		{
			name: "plural annotation match",
			obj: unstructured.Unstructured{
				Object: map[string]interface{}{
					"metadata": map[string]interface{}{
						"annotations": map[string]interface{}{
							SyncOptionsAnnotation: "Force=True",
						},
					},
				},
			},
			option: SyncOptionForce,
			want:   true,
		},
		{
			name: "plural annotation mismatch",
			obj: unstructured.Unstructured{
				Object: map[string]interface{}{
					"metadata": map[string]interface{}{
						"annotations": map[string]interface{}{
							SyncOptionsAnnotation: "Force=False",
						},
					},
				},
			},
			option: SyncOptionForce,
			want:   false,
		},
		{
			name: "argo annotation match",
			obj: unstructured.Unstructured{
				Object: map[string]interface{}{
					"metadata": map[string]interface{}{
						"annotations": map[string]interface{}{
							ArgoSyncOptionsAnnotation: "Force=True",
						},
					},
				},
			},
			option: SyncOptionForce,
			want:   true,
		},
		{
			name: "argo annotation mismatch",
			obj: unstructured.Unstructured{
				Object: map[string]interface{}{
					"metadata": map[string]interface{}{
						"annotations": map[string]interface{}{
							ArgoSyncOptionsAnnotation: "Force=False",
						},
					},
				},
			},
			option: SyncOptionForce,
			want:   false,
		},
		{
			name: "multiple options",
			obj: unstructured.Unstructured{
				Object: map[string]interface{}{
					"metadata": map[string]interface{}{
						"annotations": map[string]interface{}{
							SyncOptionsAnnotation: "Validate=False,Force=True",
						},
					},
				},
			},
			option: SyncOptionForce,
			want:   true,
		},
		{
			name: "multiple options with spaces",
			obj: unstructured.Unstructured{
				Object: map[string]interface{}{
					"metadata": map[string]interface{}{
						"annotations": map[string]interface{}{
							SyncOptionsAnnotation: "Validate=False, Force=True",
						},
					},
				},
			},
			option: SyncOptionForce,
			want:   true,
		},
		{
			name: "both annotations present, plural takes precedence",
			obj: unstructured.Unstructured{
				Object: map[string]interface{}{
					"metadata": map[string]interface{}{
						"annotations": map[string]interface{}{
							SyncOptionsAnnotation:     "Force=True",
							ArgoSyncOptionsAnnotation: "Force=False",
						},
					},
				},
			},
			option: SyncOptionForce,
			want:   true,
		},
		{
			name: "empty annotation",
			obj: unstructured.Unstructured{
				Object: map[string]interface{}{
					"metadata": map[string]interface{}{
						"annotations": map[string]interface{}{
							SyncOptionsAnnotation: "",
						},
					},
				},
			},
			option: SyncOptionForce,
			want:   false,
		},
		{
			name: "argo annotation multiple options",
			obj: unstructured.Unstructured{
				Object: map[string]interface{}{
					"metadata": map[string]interface{}{
						"annotations": map[string]interface{}{
							ArgoSyncOptionsAnnotation: "Validate=False,Force=True",
						},
					},
				},
			},
			option: SyncOptionForce,
			want:   true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.want, HasSyncOption(tt.obj, tt.option))
		})
	}
}

func TestHasForceSyncOption(t *testing.T) {
	tests := []struct {
		name string
		obj  unstructured.Unstructured
		want bool
	}{
		{
			name: "no annotations",
			obj:  unstructured.Unstructured{},
			want: false,
		},
		{
			name: "force enabled",
			obj: unstructured.Unstructured{
				Object: map[string]interface{}{
					"metadata": map[string]interface{}{
						"annotations": map[string]interface{}{
							SyncOptionsAnnotation: "Force=True",
						},
					},
				},
			},
			want: true,
		},
		{
			name: "force disabled",
			obj: unstructured.Unstructured{
				Object: map[string]interface{}{
					"metadata": map[string]interface{}{
						"annotations": map[string]interface{}{
							SyncOptionsAnnotation: "Force=False",
						},
					},
				},
			},
			want: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.want, HasForceSyncOption(tt.obj))
		})
	}
}

func TestHasResyncInProgressAnnotation(t *testing.T) {
	tests := []struct {
		name string
		obj  unstructured.Unstructured
		want bool
	}{
		{
			name: "no annotations",
			obj:  unstructured.Unstructured{},
			want: false,
		},
		{
			name: "annotation present",
			obj: unstructured.Unstructured{
				Object: map[string]interface{}{
					"metadata": map[string]interface{}{
						"annotations": map[string]interface{}{
							ResyncInProgressAnnotation: "true",
						},
					},
				},
			},
			want: true,
		},
		{
			name: "annotation missing",
			obj: unstructured.Unstructured{
				Object: map[string]interface{}{
					"metadata": map[string]interface{}{
						"annotations": map[string]interface{}{
							"some-other-annotation": "true",
						},
					},
				},
			},
			want: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.want, HasResyncInProgressAnnotation(&tt.obj))
		})
	}
}

func TestHasReplaceSyncOption(t *testing.T) {
	tests := []struct {
		name string
		obj  unstructured.Unstructured
		want bool
	}{
		{
			name: "no annotations",
			obj:  unstructured.Unstructured{},
			want: false,
		},
		{
			name: "plural annotation replace enabled",
			obj: unstructured.Unstructured{
				Object: map[string]interface{}{
					"metadata": map[string]interface{}{
						"annotations": map[string]interface{}{
							SyncOptionsAnnotation: "Replace=True",
						},
					},
				},
			},
			want: true,
		},
		{
			name: "plural annotation replace disabled",
			obj: unstructured.Unstructured{
				Object: map[string]interface{}{
					"metadata": map[string]interface{}{
						"annotations": map[string]interface{}{
							SyncOptionsAnnotation: "Replace=False",
						},
					},
				},
			},
			want: false,
		},
		{
			name: "argo annotation replace enabled",
			obj: unstructured.Unstructured{
				Object: map[string]interface{}{
					"metadata": map[string]interface{}{
						"annotations": map[string]interface{}{
							ArgoSyncOptionsAnnotation: "Replace=True",
						},
					},
				},
			},
			want: true,
		},
		{
			name: "argo annotation replace disabled",
			obj: unstructured.Unstructured{
				Object: map[string]interface{}{
					"metadata": map[string]interface{}{
						"annotations": map[string]interface{}{
							ArgoSyncOptionsAnnotation: "Replace=False",
						},
					},
				},
			},
			want: false,
		},
		{
			name: "multiple options with replace",
			obj: unstructured.Unstructured{
				Object: map[string]interface{}{
					"metadata": map[string]interface{}{
						"annotations": map[string]interface{}{
							SyncOptionsAnnotation: "Validate=False,Replace=True",
						},
					},
				},
			},
			want: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.want, HasReplaceSyncOption(tt.obj))
		})
	}
}

func TestHasPruneSyncOption(t *testing.T) {
	tests := []struct {
		name string
		obj  unstructured.Unstructured
		want bool
	}{
		{
			name: "no annotations",
			obj:  unstructured.Unstructured{},
			want: false,
		},
		{
			name: "plural annotation enabled",
			obj: unstructured.Unstructured{
				Object: map[string]interface{}{
					"metadata": map[string]interface{}{
						"annotations": map[string]interface{}{
							SyncOptionsAnnotation: "Prune=False",
						},
					},
				},
			},
			want: true,
		},
		{
			name: "plural annotation disabled",
			obj: unstructured.Unstructured{
				Object: map[string]interface{}{
					"metadata": map[string]interface{}{
						"annotations": map[string]interface{}{
							SyncOptionsAnnotation: "Prune=True",
						},
					},
				},
			},
			want: false,
		},
		{
			name: "argo annotation enabled",
			obj: unstructured.Unstructured{
				Object: map[string]interface{}{
					"metadata": map[string]interface{}{
						"annotations": map[string]interface{}{
							ArgoSyncOptionsAnnotation: "Prune=False",
						},
					},
				},
			},
			want: true,
		},
		{
			name: "argo annotation disabled",
			obj: unstructured.Unstructured{
				Object: map[string]interface{}{
					"metadata": map[string]interface{}{
						"annotations": map[string]interface{}{
							ArgoSyncOptionsAnnotation: "Prune=True",
						},
					},
				},
			},
			want: false,
		},
		{
			name: "multiple options",
			obj: unstructured.Unstructured{
				Object: map[string]interface{}{
					"metadata": map[string]interface{}{
						"annotations": map[string]interface{}{
							SyncOptionsAnnotation: "Validate=False, Prune=False",
						},
					},
				},
			},
			want: true,
		},
		{
			name: "plural annotation takes precedence",
			obj: unstructured.Unstructured{
				Object: map[string]interface{}{
					"metadata": map[string]interface{}{
						"annotations": map[string]interface{}{
							SyncOptionsAnnotation:     "Prune=True",
							ArgoSyncOptionsAnnotation: "Prune=False",
						},
					},
				},
			},
			want: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.want, HasPruneSyncOption(tt.obj))
		})
	}
}

func TestHasDeleteSyncOption(t *testing.T) {
	tests := []struct {
		name        string
		annotations map[string]string
		want        bool
	}{
		{
			name: "no annotations",
		},
		{
			name: "plural delete false",
			annotations: map[string]string{
				SyncOptionsAnnotation: "Delete=False",
			},
			want: true,
		},
		{
			name: "argo delete false",
			annotations: map[string]string{
				ArgoSyncOptionsAnnotation: "Delete=False",
			},
			want: true,
		},
		{
			name: "delete true",
			annotations: map[string]string{
				SyncOptionsAnnotation: "Delete=True",
			},
		},
		{
			name: "plural annotation takes precedence",
			annotations: map[string]string{
				SyncOptionsAnnotation:     "Delete=True",
				ArgoSyncOptionsAnnotation: "Delete=False",
			},
		},
		{
			name: "plural annotation prevents argo fallback",
			annotations: map[string]string{
				SyncOptionsAnnotation:     "Force=True",
				ArgoSyncOptionsAnnotation: "Delete=False",
			},
		},
		{
			name: "delete false among multiple options",
			annotations: map[string]string{
				SyncOptionsAnnotation: "Replace=True, Delete=False",
			},
			want: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			obj := unstructured.Unstructured{}
			obj.SetAnnotations(tt.annotations)

			assert.Equal(t, tt.want, HasDeleteSyncOption(obj))
		})
	}
}

func TestHasDetachSyncOption(t *testing.T) {
	tests := []struct {
		name        string
		annotations map[string]string
		want        bool
	}{
		{
			name: "no annotations",
		},
		{
			name: "plural detach",
			annotations: map[string]string{
				SyncOptionsAnnotation: "Detach",
			},
			want: true,
		},
		{
			name: "detach among multiple plural options",
			annotations: map[string]string{
				SyncOptionsAnnotation: "Replace=True, detach",
			},
			want: true,
		},
		{
			name: "argo detach is not a Plural detach option",
			annotations: map[string]string{
				ArgoSyncOptionsAnnotation: "detach",
			},
		},
		{
			name: "plural annotation takes precedence over argo detach",
			annotations: map[string]string{
				SyncOptionsAnnotation:     "Delete=False",
				ArgoSyncOptionsAnnotation: "detach",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			obj := unstructured.Unstructured{}
			obj.SetAnnotations(tt.annotations)

			assert.Equal(t, tt.want, HasDetachSyncOption(obj))
		})
	}
}
