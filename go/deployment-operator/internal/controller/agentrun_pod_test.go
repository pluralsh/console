package controller

import (
	"testing"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/deployment-operator/api/v1alpha1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/common"
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

func TestBuildAgentRunPod_TerminationGracePeriodSeconds(t *testing.T) {
	tests := []struct {
		name                string
		runtimeTemplate     *corev1.PodTemplateSpec
		expectedGracePeriod int64
	}{
		{
			name:                "should set terminationGracePeriodSeconds to default when template is nil",
			runtimeTemplate:     nil,
			expectedGracePeriod: defaultPodTerminationGracePeriodSeconds,
		},
		{
			name: "should set terminationGracePeriodSeconds to default when not specified",
			runtimeTemplate: &corev1.PodTemplateSpec{
				Spec: corev1.PodSpec{},
			},
			expectedGracePeriod: defaultPodTerminationGracePeriodSeconds,
		},
		{
			name: "should respect user-specified terminationGracePeriodSeconds",
			runtimeTemplate: &corev1.PodTemplateSpec{
				Spec: corev1.PodSpec{
					TerminationGracePeriodSeconds: lo.ToPtr(int64(90)),
				},
			},
			expectedGracePeriod: 90,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
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

			pod := buildAgentRunPod(run, runtime)

			if pod.Spec.TerminationGracePeriodSeconds == nil {
				t.Fatal("TerminationGracePeriodSeconds should be set")
			}

			assert.Equal(t, tt.expectedGracePeriod, *pod.Spec.TerminationGracePeriodSeconds)
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

func TestBuildAgentRunPod_IncludesMCPServerSidecar(t *testing.T) {
	run := &v1alpha1.AgentRun{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "test-run",
			Namespace: "default",
		},
		Spec: v1alpha1.AgentRunSpec{
			RuntimeRef: v1alpha1.AgentRuntimeReference{Name: "test-runtime"},
			Prompt:     "test prompt",
			Repository: "https://github.com/test/repo",
			Mode:       console.AgentRunModeAnalyze,
		},
		Status: v1alpha1.AgentRunStatus{
			Status: v1alpha1.Status{ID: lo.ToPtr("test-run-id")},
		},
	}

	runtime := &v1alpha1.AgentRuntime{
		ObjectMeta: metav1.ObjectMeta{Name: "test-runtime"},
		Spec: v1alpha1.AgentRuntimeSpec{
			Type:            console.AgentRuntimeTypeClaude,
			TargetNamespace: "default",
		},
	}

	pod := buildAgentRunPod(run, runtime)

	var mcp *corev1.Container
	for i := range pod.Spec.InitContainers {
		if pod.Spec.InitContainers[i].Name == mcpServerContainerName {
			mcp = &pod.Spec.InitContainers[i]
			break
		}
	}
	if mcp == nil {
		t.Fatalf("expected %s init container to be present", mcpServerContainerName)
	}

	assert.Equal(t, corev1.ContainerRestartPolicyAlways, lo.FromPtr(mcp.RestartPolicy))
	assert.Equal(t, []string{"/agent-mcpserver"}, mcp.Command)
	assert.Contains(t, mcp.Args, "--address")
	assert.Contains(t, mcp.Args, common.AgentMCPServerAddress)
	assert.Contains(t, mcp.Args, "--grpc-address")
	assert.Contains(t, mcp.Args, common.AgentMCPGRPCServerAddress)
	assert.Len(t, mcp.EnvFrom, 1)
	assert.Equal(t, run.Name, mcp.EnvFrom[0].SecretRef.LocalObjectReference.Name)

	var excludeTools string
	for _, e := range mcp.Env {
		if e.Name == EnvMcpExcludeTools {
			excludeTools = e.Value
		}
	}
	assert.Equal(t, analyzeModeExcludedTools, excludeTools)

	var bootstrap *corev1.Container
	for i := range pod.Spec.InitContainers {
		if pod.Spec.InitContainers[i].Name == agentBootstrapContainerName {
			bootstrap = &pod.Spec.InitContainers[i]
			break
		}
	}
	if bootstrap == nil {
		t.Fatalf("expected %s init container to be present", agentBootstrapContainerName)
	}
	assert.Equal(t, []string{"/agent-bootstrap"}, bootstrap.Command)
	assert.Contains(t, bootstrap.Args, "--working-dir")
	assert.Contains(t, bootstrap.Args, common.AgentRunSharedWorkDir)
}
