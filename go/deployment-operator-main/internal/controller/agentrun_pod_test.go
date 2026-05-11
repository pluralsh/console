package controller

import (
	"testing"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/deployment-operator/api/v1alpha1"
	"github.com/samber/lo"
	"github.com/stretchr/testify/assert"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func TestBuildAgentRunPod_AutomountServiceAccountToken(t *testing.T) {
	tests := []struct {
		name                                 string
		runtimeTemplate                      *corev1.PodTemplateSpec
		expectedAutomountServiceAccountToken *bool
		description                          string
	}{
		{
			name:                                 "should set automountServiceAccountToken to false by default",
			runtimeTemplate:                      nil,
			expectedAutomountServiceAccountToken: lo.ToPtr(false),
			description:                          "When no template is provided, automountServiceAccountToken should default to false",
		},
		{
			name: "should set automountServiceAccountToken to false when not specified",
			runtimeTemplate: &corev1.PodTemplateSpec{
				Spec: corev1.PodSpec{},
			},
			expectedAutomountServiceAccountToken: lo.ToPtr(false),
			description:                          "When template is provided but automountServiceAccountToken is not set, it should default to false",
		},
		{
			name: "should respect user-specified true value",
			runtimeTemplate: &corev1.PodTemplateSpec{
				Spec: corev1.PodSpec{
					AutomountServiceAccountToken: lo.ToPtr(true),
				},
			},
			expectedAutomountServiceAccountToken: lo.ToPtr(true),
			description:                          "When user explicitly sets automountServiceAccountToken to true, it should be preserved",
		},
		{
			name: "should respect user-specified false value",
			runtimeTemplate: &corev1.PodTemplateSpec{
				Spec: corev1.PodSpec{
					AutomountServiceAccountToken: lo.ToPtr(false),
				},
			},
			expectedAutomountServiceAccountToken: lo.ToPtr(false),
			description:                          "When user explicitly sets automountServiceAccountToken to false, it should be preserved",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Arrange
			run := &v1alpha1.AgentRun{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "test-run",
					Namespace: "default",
				},
				Spec: v1alpha1.AgentRunSpec{
					RuntimeRef: v1alpha1.AgentRuntimeReference{
						Name: "test-runtime",
					},
					Prompt:     "test prompt",
					Repository: "https://github.com/test/repo",
					Mode:       console.AgentRunModeAnalyze,
				},
				Status: v1alpha1.AgentRunStatus{
					Status: v1alpha1.Status{
						ID: lo.ToPtr("test-run-id"),
					},
				},
			}

			runtime := &v1alpha1.AgentRuntime{
				ObjectMeta: metav1.ObjectMeta{
					Name: "test-runtime",
				},
				Spec: v1alpha1.AgentRuntimeSpec{
					Type:            console.AgentRuntimeTypeClaude,
					TargetNamespace: "default",
					Template:        tt.runtimeTemplate,
				},
			}

			// Act
			pod := buildAgentRunPod(run, runtime)

			// Assert
			assert.NotNil(t, pod, "Pod should not be nil")
			assert.Equal(t, tt.expectedAutomountServiceAccountToken, pod.Spec.AutomountServiceAccountToken, tt.description)
		})
	}
}

func TestBuildAgentRunPod_BasicStructure(t *testing.T) {
	// Arrange
	run := &v1alpha1.AgentRun{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "test-run",
			Namespace: "default",
		},
		Spec: v1alpha1.AgentRunSpec{
			RuntimeRef: v1alpha1.AgentRuntimeReference{
				Name: "test-runtime",
			},
			Prompt:     "test prompt",
			Repository: "https://github.com/test/repo",
			Mode:       console.AgentRunModeAnalyze,
		},
		Status: v1alpha1.AgentRunStatus{
			Status: v1alpha1.Status{
				ID: lo.ToPtr("test-run-id"),
			},
		},
	}

	runtime := &v1alpha1.AgentRuntime{
		ObjectMeta: metav1.ObjectMeta{
			Name: "test-runtime",
		},
		Spec: v1alpha1.AgentRuntimeSpec{
			Type:            console.AgentRuntimeTypeClaude,
			TargetNamespace: "default",
		},
	}

	// Act
	pod := buildAgentRunPod(run, runtime)

	// Assert
	assert.NotNil(t, pod, "Pod should not be nil")
	assert.Equal(t, "test-run", pod.Name)
	assert.Equal(t, "default", pod.Namespace)
	assert.Equal(t, corev1.RestartPolicyNever, pod.Spec.RestartPolicy)
	assert.NotNil(t, pod.Spec.AutomountServiceAccountToken, "AutomountServiceAccountToken should be set")
	assert.False(t, *pod.Spec.AutomountServiceAccountToken, "AutomountServiceAccountToken should be false by default")
}
