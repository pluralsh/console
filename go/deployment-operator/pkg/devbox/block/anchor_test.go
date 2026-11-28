package block

import (
	"testing"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/utils/ptr"
)

func TestAnchorDefaultsPassCommonPolicies(t *testing.T) {
	pod, err := anchorPod(nil, "devbox-block:test", "devbox-d1", "node-a", "ate-system")
	if err != nil {
		t.Fatal(err)
	}
	spec := pod.Spec
	c := spec.Containers[0]
	switch {
	case spec.HostNetwork || spec.HostPID || spec.HostIPC:
		t.Fatal("the restricted profile allows no host namespaces")
	case !ptr.Deref(spec.SecurityContext.RunAsNonRoot, false) || spec.SecurityContext.SeccompProfile.Type != corev1.SeccompProfileTypeRuntimeDefault:
		t.Fatal("the pod should run as non-root with the runtime's seccomp profile")
	case !ptr.Deref(c.SecurityContext.RunAsNonRoot, false) || ptr.Deref(c.SecurityContext.AllowPrivilegeEscalation, true) ||
		ptr.Deref(c.SecurityContext.Privileged, true) || !ptr.Deref(c.SecurityContext.ReadOnlyRootFilesystem, false) ||
		len(c.SecurityContext.Capabilities.Drop) != 1 || c.SecurityContext.Capabilities.Drop[0] != "ALL":
		t.Fatalf("the container should be locked down, got %+v", c.SecurityContext)
	case c.Resources.Requests.Cpu().IsZero() || c.Resources.Requests.Memory().IsZero() ||
		c.Resources.Limits.Cpu().IsZero() || c.Resources.Limits.Memory().IsZero():
		t.Fatalf("the container should request and limit CPU and memory, got %+v", c.Resources)
	case c.LivenessProbe == nil || c.ReadinessProbe == nil:
		t.Fatal("the container should have probes")
	case ptr.Deref(spec.AutomountServiceAccountToken, true):
		t.Fatal("the anchor needs no API token")
	case pod.Labels["app.kubernetes.io/name"] != "devbox-block-anchor" || pod.Labels[DiskLabel] != "devbox-d1":
		t.Fatalf("the anchor should carry the standard labels and its disk's, got %v", pod.Labels)
	}
}

func TestAnchorTemplateOverridesAllButWhatTheControllerNeeds(t *testing.T) {
	template, err := ParseAnchorTemplate([]byte(`
metadata:
  name: hijack
  labels:
    team: platform
    devboxes.plural.sh/block-disk: other
  annotations:
    policies.kyverno.io/exempt: "true"
spec:
  nodeName: node-b
  hostNetwork: true
  serviceAccountName: devbox-block-anchor
  priorityClassName: system-node-critical
  imagePullSecrets: [{name: regcred}]
  volumes:
    - name: home
      emptyDir: {}
  containers:
    - name: anchor
      image: evil
      args: [sh]
      resources:
        limits:
          cpu: 100m
`))
	if err != nil {
		t.Fatal(err)
	}
	pod, err := anchorPod(template, "devbox-block:test", "devbox-d1", "node-a", "ate-system")
	if err != nil {
		t.Fatal(err)
	}
	c := pod.Spec.Containers[0]
	switch {
	case pod.Labels["team"] != "platform" || pod.Annotations["policies.kyverno.io/exempt"] != "true":
		t.Fatalf("labels and annotations should be added, got %v %v", pod.Labels, pod.Annotations)
	case pod.Labels["app.kubernetes.io/name"] != "devbox-block-anchor":
		t.Fatal("the default labels should stay")
	case !pod.Spec.HostNetwork || pod.Spec.ServiceAccountName != "devbox-block-anchor" || pod.Spec.PriorityClassName != "system-node-critical" ||
		pod.Spec.ImagePullSecrets[0].Name != "regcred":
		t.Fatalf("pod settings should be overridden, got %+v", pod.Spec)
	case c.Resources.Limits.Cpu().String() != "100m" || c.Resources.Limits.Memory().IsZero():
		t.Fatalf("resources should merge over the defaults, got %+v", c.Resources)
	case pod.Name != "devbox-d1-anchor" || pod.Namespace != "ate-system" || pod.Labels[DiskLabel] != "devbox-d1" || pod.Spec.NodeName != "node-a":
		t.Fatalf("the controller's identity and placement can't be overridden, got %s/%s %v %s", pod.Namespace, pod.Name, pod.Labels, pod.Spec.NodeName)
	case c.Image != "devbox-block:test" || len(c.Args) != 1 || c.Args[0] != "--mode=anchor":
		t.Fatalf("the image and args can't be overridden, got %s %v", c.Image, c.Args)
	case len(pod.Spec.Volumes) != 1 || pod.Spec.Volumes[0].PersistentVolumeClaim == nil || pod.Spec.Volumes[0].PersistentVolumeClaim.ClaimName != "devbox-d1":
		t.Fatalf("the home volume must be the disk's claim, got %+v", pod.Spec.Volumes)
	}

	if _, err := ParseAnchorTemplate([]byte("spec: [")); err == nil {
		t.Fatal("a template that isn't YAML should be refused")
	}
	if _, err := ParseAnchorTemplate([]byte("spec:\n  containers: 3\n")); err == nil {
		t.Fatal("a template that doesn't apply to a pod should be refused")
	}
}
