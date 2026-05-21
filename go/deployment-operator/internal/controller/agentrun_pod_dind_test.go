package controller

import (
	"strings"
	"testing"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/deployment-operator/api/v1alpha1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/dind"
	"github.com/samber/lo"
	"github.com/stretchr/testify/assert"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func TestEnableDind_WiresClientContainer(t *testing.T) {
	pod := &corev1.Pod{
		Spec: corev1.PodSpec{
			Containers: []corev1.Container{{
				Name: defaultContainer,
			}},
		},
	}

	enableDind(pod)

	container := findContainer(pod, defaultContainer)
	if container == nil {
		t.Fatal("expected default container")
	}
	assert.Contains(t, container.Env, corev1.EnvVar{
		Name:  dind.DockerHostEnv,
		Value: dind.DockerHostValue,
	})
	assert.Contains(t, container.Env, corev1.EnvVar{
		Name:  dind.DockerTLSVerifyEnv,
		Value: "1",
	})
	assert.Contains(t, container.Env, corev1.EnvVar{
		Name:  dind.DockerCertPathEnv,
		Value: dind.ClientCertsPath,
	})

	foundCertsMount := false
	for _, mount := range container.VolumeMounts {
		if mount.Name == dockerCertsVolumeName && mount.MountPath == dind.CertsVolumePath && mount.ReadOnly {
			foundCertsMount = true
			break
		}
	}
	assert.True(t, foundCertsMount, "expected read-only /certs mount on agent container")

	dindContainer := findContainer(pod, dindContainerName)
	if dindContainer == nil {
		t.Fatal("expected dind sidecar container")
	}
	assert.Nil(t, findInitContainer(pod, dindContainerName), "dind must not be an init container")
	assert.True(t, strings.HasSuffix(dindContainer.Image, ":29.4.1-dind"))
	assert.NotContains(t, dindContainer.Image, "dind-rootless")
	if dindContainer.SecurityContext == nil {
		t.Fatal("expected dind security context")
	}
	assert.Equal(t, lo.ToPtr(int64(0)), dindContainer.SecurityContext.RunAsUser)
	assert.Equal(t, lo.ToPtr(false), dindContainer.SecurityContext.RunAsNonRoot)
	assert.True(t, lo.FromPtr(dindContainer.SecurityContext.Privileged))
	assertSharedContextMount(t, dindContainer.VolumeMounts, dind.SharedContextMountPath)
	assertDindEnvNotContains(t, dindContainer.Env, "DOCKERD_ROOTLESS_ROOTLESSKIT")
}

func assertDindEnvNotContains(t *testing.T, envs []corev1.EnvVar, namePrefix string) {
	t.Helper()
	for _, env := range envs {
		if strings.HasPrefix(env.Name, namePrefix) {
			t.Fatalf("did not expect rootless dind env %q", env.Name)
		}
	}
}

func assertSharedContextMount(t *testing.T, mounts []corev1.VolumeMount, wantPath string) {
	t.Helper()
	for _, mount := range mounts {
		if mount.Name == dind.SharedContextVolumeName {
			assert.Equal(t, wantPath, mount.MountPath)
			return
		}
	}
	t.Fatalf("expected %q volume mount at %q", dind.SharedContextVolumeName, wantPath)
}

func findContainer(pod *corev1.Pod, name string) *corev1.Container {
	for i := range pod.Spec.Containers {
		if pod.Spec.Containers[i].Name == name {
			return &pod.Spec.Containers[i]
		}
	}
	return nil
}

func findInitContainer(pod *corev1.Pod, name string) *corev1.Container {
	for i := range pod.Spec.InitContainers {
		if pod.Spec.InitContainers[i].Name == name {
			return &pod.Spec.InitContainers[i]
		}
	}
	return nil
}

func testAgentRun() *v1alpha1.AgentRun {
	return &v1alpha1.AgentRun{
		ObjectMeta: metav1.ObjectMeta{Name: "run", Namespace: "default"},
		Spec: v1alpha1.AgentRunSpec{
			RuntimeRef: v1alpha1.AgentRuntimeReference{Name: "runtime"},
		},
		Status: v1alpha1.AgentRunStatus{
			Status: v1alpha1.Status{ID: lo.ToPtr("run-id")},
		},
	}
}

func TestBuildAgentRunPod_DindWiresSidecar(t *testing.T) {
	run := testAgentRun()
	runtime := &v1alpha1.AgentRuntime{
		Spec: v1alpha1.AgentRuntimeSpec{
			Type: console.AgentRuntimeTypeCodex,
			Dind: lo.ToPtr(true),
		},
	}

	pod := buildAgentRunPod(run, runtime)
	assert.Equal(t, lo.ToPtr(nonRootGID), pod.Spec.SecurityContext.FSGroup)

	agentContainer := findContainer(pod, defaultContainer)
	if agentContainer == nil {
		t.Fatal("expected default container")
	}
	assertSharedContextMount(t, agentContainer.VolumeMounts, dind.SharedContextMountPath)
	assert.Contains(t, agentContainer.Env, corev1.EnvVar{
		Name:  dind.DockerHostEnv,
		Value: dind.DockerHostValue,
	})
	assert.Contains(t, agentContainer.Env, corev1.EnvVar{
		Name:  dind.DockerTLSVerifyEnv,
		Value: "1",
	})
	assert.Contains(t, agentContainer.Env, corev1.EnvVar{
		Name:  dind.DockerCertPathEnv,
		Value: dind.ClientCertsPath,
	})

	dindContainer := findContainer(pod, dindContainerName)
	if dindContainer == nil {
		t.Fatal("expected dind sidecar container")
	}
	assert.Nil(t, findInitContainer(pod, dindContainerName), "dind must not be an init container")
	assert.True(t, strings.HasSuffix(dindContainer.Image, ":29.4.1-dind"))
	if dindContainer.SecurityContext == nil {
		t.Fatal("expected dind security context")
	}
	assert.Equal(t, lo.ToPtr(int64(0)), dindContainer.SecurityContext.RunAsUser)
	assertSharedContextMount(t, dindContainer.VolumeMounts, dind.SharedContextMountPath)
	assertDindEnvNotContains(t, dindContainer.Env, "DOCKERD_ROOTLESS_ROOTLESSKIT")
}
