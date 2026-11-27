package block

import (
	"encoding/json"
	"fmt"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/util/strategicpatch"
	"k8s.io/utils/ptr"
	"sigs.k8s.io/yaml"
)

const anchorContainer = "anchor"

func anchorName(disk string) string { return disk + "-anchor" }

// ParseAnchorTemplate reads a partial Pod, in YAML or JSON, that anchor pods are patched with, and checks that it
// applies.
func ParseAnchorTemplate(data []byte) ([]byte, error) {
	patch, err := yaml.YAMLToJSON(data)
	if err != nil {
		return nil, fmt.Errorf("reading the anchor template: %w", err)
	}
	if _, err := anchorPod(patch, "image", "disk", "node", "ns"); err != nil {
		return nil, err
	}
	return patch, nil
}

// anchorPod is the pod that keeps a disk attached to and mounted on a node. Its defaults pass the Pod Security
// Standards' restricted profile and the policies policy engines commonly ship (resource requests and limits,
// probes, a non-root user, a read-only root filesystem, no host namespaces, standard labels). template, a strategic
// merge patch, overrides any of them; the fields the controller relies on are set again after it.
func anchorPod(template []byte, image, disk, node, namespace string) (*corev1.Pod, error) {
	probe := func(period int32) *corev1.Probe {
		return &corev1.Probe{
			ProbeHandler:     corev1.ProbeHandler{Exec: &corev1.ExecAction{Command: []string{"/devbox-block", "--version"}}},
			PeriodSeconds:    period,
			TimeoutSeconds:   5,
			FailureThreshold: 3,
		}
	}
	pod := &corev1.Pod{
		TypeMeta: metav1.TypeMeta{APIVersion: "v1", Kind: "Pod"},
		ObjectMeta: metav1.ObjectMeta{Labels: map[string]string{
			"app.kubernetes.io/name":       "devbox-block-anchor",
			"app.kubernetes.io/component":  "anchor",
			"app.kubernetes.io/part-of":    "agent-substrate",
			"app.kubernetes.io/managed-by": "devbox-block",
		}},
		Spec: corev1.PodSpec{
			DNSPolicy:                     corev1.DNSDefault,
			AutomountServiceAccountToken:  ptr.To(false),
			EnableServiceLinks:            ptr.To(false),
			TerminationGracePeriodSeconds: ptr.To[int64](5),
			// It goes wherever Substrate put the actor.
			Tolerations: []corev1.Toleration{{Operator: corev1.TolerationOpExists}},
			SecurityContext: &corev1.PodSecurityContext{
				RunAsNonRoot:   ptr.To(true),
				RunAsUser:      ptr.To[int64](65532),
				RunAsGroup:     ptr.To[int64](65532),
				SeccompProfile: &corev1.SeccompProfile{Type: corev1.SeccompProfileTypeRuntimeDefault},
			},
			Containers: []corev1.Container{{
				Name:            anchorContainer,
				ImagePullPolicy: corev1.PullIfNotPresent,
				Resources: corev1.ResourceRequirements{
					Requests: corev1.ResourceList{corev1.ResourceCPU: resource.MustParse("5m"), corev1.ResourceMemory: resource.MustParse("16Mi")},
					Limits:   corev1.ResourceList{corev1.ResourceCPU: resource.MustParse("50m"), corev1.ResourceMemory: resource.MustParse("32Mi")},
				},
				LivenessProbe:  probe(60),
				ReadinessProbe: probe(30),
				SecurityContext: &corev1.SecurityContext{
					RunAsNonRoot:             ptr.To(true),
					Privileged:               ptr.To(false),
					AllowPrivilegeEscalation: ptr.To(false),
					ReadOnlyRootFilesystem:   ptr.To(true),
					Capabilities:             &corev1.Capabilities{Drop: []corev1.Capability{"ALL"}},
				},
			}},
		},
	}
	if len(template) > 0 {
		base, err := json.Marshal(pod)
		if err != nil {
			return nil, err
		}
		patched, err := strategicpatch.StrategicMergePatch(base, template, &corev1.Pod{})
		if err != nil {
			return nil, fmt.Errorf("applying the anchor template: %w", err)
		}
		pod = &corev1.Pod{}
		if err := json.Unmarshal(patched, pod); err != nil {
			return nil, fmt.Errorf("applying the anchor template: %w", err)
		}
	}

	pod.Name, pod.Namespace, pod.GenerateName = anchorName(disk), namespace, ""
	if pod.Labels == nil {
		pod.Labels = map[string]string{}
	}
	pod.Labels[DiskLabel] = disk
	pod.Spec.NodeName = node
	pod.Spec.RestartPolicy = corev1.RestartPolicyAlways
	pod.Spec.Volumes = append(removeVolume(pod.Spec.Volumes, "home"), corev1.Volume{Name: "home", VolumeSource: corev1.VolumeSource{
		PersistentVolumeClaim: &corev1.PersistentVolumeClaimVolumeSource{ClaimName: disk},
	}})
	i := containerIndex(pod.Spec.Containers, anchorContainer)
	if i < 0 {
		pod.Spec.Containers = append(pod.Spec.Containers, corev1.Container{Name: anchorContainer})
		i = len(pod.Spec.Containers) - 1
	}
	c := &pod.Spec.Containers[i]
	c.Image, c.Command, c.Args = image, nil, []string{"--mode=anchor"}
	c.VolumeMounts = append(removeMount(c.VolumeMounts, "home"), corev1.VolumeMount{Name: "home", MountPath: "/home"})
	return pod, nil
}

func removeVolume(vs []corev1.Volume, name string) []corev1.Volume {
	out := vs[:0:0]
	for _, v := range vs {
		if v.Name != name {
			out = append(out, v)
		}
	}
	return out
}

func removeMount(ms []corev1.VolumeMount, name string) []corev1.VolumeMount {
	out := ms[:0:0]
	for _, m := range ms {
		if m.Name != name {
			out = append(out, m)
		}
	}
	return out
}

func containerIndex(cs []corev1.Container, name string) int {
	for i, c := range cs {
		if c.Name == name {
			return i
		}
	}
	return -1
}
