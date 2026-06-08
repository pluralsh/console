package controller

import (
	"testing"
	"time"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/deployment-operator/api/v1alpha1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/common"
	"github.com/samber/lo"
	"github.com/stretchr/testify/assert"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"sigs.k8s.io/yaml"
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

func TestBuildAgentRunPod_AppliesCertificateBundleTemplate(t *testing.T) {
	var manifest struct {
		Template corev1.PodTemplateSpec `json:"template"`
	}
	err := yaml.Unmarshal([]byte(`
template:
  spec:
    containers:
    - name: default
      volumeMounts:
      - mountPath: /etc/ssl/certs/
        name: ca-certificate-only
        readOnly: true
    initContainers:
    - name: agent-bootstrap
      volumeMounts:
      - mountPath: /etc/ssl/certs/
        name: ca-certificate-only
        readOnly: true
    - name: mcpserver
      volumeMounts:
      - mountPath: /etc/ssl/certs/
        name: ca-certificate-only
        readOnly: true
    volumes:
    - configMap:
        defaultMode: 420
        items:
        - key: ca-certificates.crt
          path: ca-certificates.crt
        name: plrl-bundle
        optional: false
      name: ca-certificate-only
`), &manifest)
	assert.NoError(t, err)

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
			Template:        &manifest.Template,
		},
	}

	pod := buildAgentRunPod(run, runtime)

	assert.NotNil(t, pod)
	assertContainerNamesUnique(t, pod)
	assert.Len(t, pod.Spec.Containers, 1)
	assert.Equal(t, defaultContainer, pod.Spec.Containers[0].Name)

	defaultC := requireContainer(t, pod.Spec.Containers, defaultContainer)
	mcpServer := requireContainer(t, pod.Spec.InitContainers, mcpServerContainerName)
	bootstrap := requireContainer(t, pod.Spec.InitContainers, agentBootstrapContainerName)

	expectedMount := corev1.VolumeMount{
		Name:      "ca-certificate-only",
		MountPath: "/etc/ssl/certs/",
		ReadOnly:  true,
	}
	assert.Contains(t, defaultC.VolumeMounts, expectedMount)
	assert.Contains(t, mcpServer.VolumeMounts, expectedMount)
	assert.Contains(t, bootstrap.VolumeMounts, expectedMount)

	volume := requireVolume(t, pod.Spec.Volumes, "ca-certificate-only")
	if assert.NotNil(t, volume.ConfigMap) {
		assert.Equal(t, "plrl-bundle", volume.ConfigMap.Name)
		assert.Equal(t, int32(420), lo.FromPtr(volume.ConfigMap.DefaultMode))
		assert.Equal(t, lo.ToPtr(false), volume.ConfigMap.Optional)
		assert.Equal(t, []corev1.KeyToPath{{
			Key:  "ca-certificates.crt",
			Path: "ca-certificates.crt",
		}}, volume.ConfigMap.Items)
	}
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

func TestGetAgentRunPodCompletion(t *testing.T) {
	tests := []struct {
		name       string
		pod        *corev1.Pod
		wantStatus console.AgentRunStatus
		wantPhase  v1alpha1.AgentRunPhase
		wantReason string
		wantOK     bool
		wantDelay  bool
	}{
		{
			name: "completes failed init container",
			pod: &corev1.Pod{
				Status: corev1.PodStatus{
					InitContainerStatuses: []corev1.ContainerStatus{
						{
							Name: agentBootstrapContainerName,
							State: corev1.ContainerState{
								Terminated: &corev1.ContainerStateTerminated{
									ExitCode: 1,
									Message:  "bootstrap failed",
								},
							},
						},
					},
				},
			},
			wantStatus: console.AgentRunStatusFailed,
			wantPhase:  v1alpha1.AgentRunPhaseFailed,
			wantReason: "init container \"agent-bootstrap\" failed with exit code 1: bootstrap failed",
			wantOK:     true,
		},
		{
			name: "delays recent failed init container",
			pod: &corev1.Pod{
				Status: corev1.PodStatus{
					InitContainerStatuses: []corev1.ContainerStatus{
						{
							Name: agentBootstrapContainerName,
							State: corev1.ContainerState{
								Terminated: &corev1.ContainerStateTerminated{
									ExitCode:   1,
									Message:    "bootstrap failed",
									FinishedAt: metav1.Time{Time: time.Now()},
								},
							},
						},
					},
				},
			},
			wantStatus: console.AgentRunStatusFailed,
			wantPhase:  v1alpha1.AgentRunPhaseFailed,
			wantReason: "init container \"agent-bootstrap\" failed with exit code 1: bootstrap failed",
			wantOK:     true,
			wantDelay:  true,
		},
		{
			name: "completes timed out pod",
			pod: &corev1.Pod{
				ObjectMeta: metav1.ObjectMeta{
					CreationTimestamp: metav1.Time{Time: time.Now().Add(-13 * time.Hour)},
				},
				Status: corev1.PodStatus{
					StartTime: &metav1.Time{Time: time.Now().Add(-13 * time.Hour)},
				},
			},
			wantStatus: console.AgentRunStatusCancelled,
			wantPhase:  v1alpha1.AgentRunPhaseCancelled,
			wantOK:     true,
		},
		{
			name: "ignores successful init container",
			pod: &corev1.Pod{
				Status: corev1.PodStatus{
					InitContainerStatuses: []corev1.ContainerStatus{
						{
							Name: agentBootstrapContainerName,
							State: corev1.ContainerState{
								Terminated: &corev1.ContainerStateTerminated{
									ExitCode: 0,
								},
							},
						},
					},
				},
			},
			wantOK: false,
		},
		{
			name:   "ignores nil pod",
			pod:    nil,
			wantOK: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			completion, ok, delay := getAgentRunPodCompletion(tt.pod)
			assert.Equal(t, tt.wantOK, ok)
			assert.Equal(t, tt.wantDelay, delay)
			if !tt.wantOK {
				assert.Nil(t, completion)
				return
			}

			assert.Equal(t, tt.wantStatus, completion.status)
			assert.Equal(t, tt.wantPhase, completion.phase)
			if tt.wantReason == "" {
				assert.Nil(t, completion.reason)
			} else {
				assert.NotNil(t, completion.reason)
				assert.Equal(t, tt.wantReason, *completion.reason)
			}
		})
	}
}

func requireContainer(t *testing.T, containers []corev1.Container, name string) corev1.Container {
	t.Helper()
	for _, container := range containers {
		if container.Name == name {
			return container
		}
	}
	t.Fatalf("expected container %s to be present", name)
	return corev1.Container{}
}

func requireVolume(t *testing.T, volumes []corev1.Volume, name string) corev1.Volume {
	t.Helper()
	for _, volume := range volumes {
		if volume.Name == name {
			return volume
		}
	}
	t.Fatalf("expected volume %s to be present", name)
	return corev1.Volume{}
}

func assertContainerNamesUnique(t *testing.T, pod *corev1.Pod) {
	t.Helper()
	names := map[string]struct{}{}
	for _, container := range append(pod.Spec.Containers, pod.Spec.InitContainers...) {
		if _, ok := names[container.Name]; ok {
			t.Fatalf("container name %s is duplicated", container.Name)
		}
		names[container.Name] = struct{}{}
	}
}
