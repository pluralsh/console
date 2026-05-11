package helpers

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/gruntwork-io/terratest/modules/k8s"
	"github.com/pluralsh/console/go/client"
	"github.com/samber/lo"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	runtimerrors "sigs.k8s.io/controller-runtime/pkg/client"
)

const (
	defaultPodContainerName = "default"
)

type PodOptions struct {
	Name          string
	Namespace     string
	Labels        map[string]any
	Annotations   map[string]any
	RestartPolicy corev1.RestartPolicy
	Image         string
	Registry      string
	Command       []string
	Volumes       []corev1.Volume
	VolumeMounts  []corev1.VolumeMount
}

func (in *PodOptions) ToObjectMeta() metav1.ObjectMeta {
	return metav1.ObjectMeta{
		Name:        in.Name,
		Namespace:   in.Namespace,
		Labels:      ToStringMap(in.Labels),
		Annotations: ToStringMap(in.Annotations),
	}
}

type PodOption func(*PodOptions)

func WithPodRestartPolicy(policy corev1.RestartPolicy) PodOption {
	return func(opts *PodOptions) {
		opts.RestartPolicy = policy
	}
}

func WithPodVolumes(volumes ...corev1.Volume) PodOption {
	return func(opts *PodOptions) {
		opts.Volumes = volumes
	}
}

func WithPodVolumeMounts(volumeMounts ...corev1.VolumeMount) PodOption {
	return func(opts *PodOptions) {
		opts.VolumeMounts = volumeMounts
	}
}

func WithPodImage(image string) PodOption {
	return func(opts *PodOptions) {
		opts.Image = image
	}
}

func WithPodCommand(command ...string) PodOption {
	return func(opts *PodOptions) {
		opts.Command = command
	}
}

func WithPodLabels(labels map[string]any) PodOption {
	return func(opts *PodOptions) {
		opts.Labels = MergeFlat(opts.Labels, labels)
	}
}

func WithPodAnnotations(annotations map[string]any) PodOption {
	return func(opts *PodOptions) {
		opts.Annotations = MergeFlat(opts.Annotations, annotations)
	}
}

func WithPodDefaults(defaults *client.SentinelCheckIntegrationTestDefaultConfigurationFragment) PodOption {
	return func(opts *PodOptions) {
		if defaults == nil {
			return
		}

		if defaults.ResourceLabels != nil {
			opts.Labels = MergeFlat(opts.Labels, defaults.ResourceLabels)
		}

		if defaults.ResourceAnnotations != nil {
			opts.Annotations = MergeFlat(opts.Annotations, defaults.ResourceAnnotations)
		}

		if defaults.Registry != nil {
			opts.Registry = lo.FromPtr(defaults.Registry)
		}
	}
}

type Pod struct {
	baseResource

	options *PodOptions
}

func (in *Pod) Name() string {
	return in.options.Name
}

func (in *Pod) Namespace() string {
	return in.options.Namespace
}

func (in *Pod) Create(t *testing.T) error {
	return k8s.KubectlApplyFromStringE(t,
		in.toKubectlOptions(),
		in.toJSON(in.toPod()),
	)
}

func (in *Pod) Delete(t *testing.T) error {
	clientset, err := in.clientset(t)
	if err != nil {
		return err
	}

	return runtimerrors.IgnoreNotFound(
		clientset.CoreV1().Pods(in.Namespace()).Delete(context.Background(), in.Name(), metav1.DeleteOptions{}),
	)
}

func (in *Pod) Get(t *testing.T) (*corev1.Pod, error) {
	return k8s.GetPodE(t, in.toKubectlOptions(), in.Name())
}

func (in *Pod) Exists(t *testing.T) (bool, error) {
	_, err := k8s.GetPodE(t, in.toKubectlOptions(), in.Name())
	if err != nil {
		return false, runtimerrors.IgnoreNotFound(err)
	}

	return true, nil
}

func (in *Pod) WaitForReady(t *testing.T, timeout time.Duration) error {
	ticker := time.NewTicker(defaultTickerInterval)
	defer ticker.Stop()

	timer := time.NewTimer(timeout)
	defer timer.Stop()

	for {
		select {
		case <-timer.C:
			return fmt.Errorf("timeout waiting for pod %s/%s to succeed", in.Namespace(), in.Name())
		case <-ticker.C:
			pod, err := k8s.GetPodE(t, in.toKubectlOptions(), in.Name())
			if err != nil {
				t.Logf("failed to get pod %s/%s: %v", in.Namespace(), in.Name(), err)
				continue
			}

			switch pod.Status.Phase {
			case corev1.PodSucceeded:
				return nil
			case corev1.PodFailed:
				logs := k8s.GetPodLogs(t, in.toKubectlOptions(), pod, defaultPodContainerName)
				return fmt.Errorf("pod %s/%s failed: %s\nlogs:\n%s", in.Namespace(), in.Name(), pod.Status.Reason, logs)
			}
		}
	}
}

func (in *Pod) toPod() *corev1.Pod {
	return &corev1.Pod{
		TypeMeta: metav1.TypeMeta{
			Kind:       "Pod",
			APIVersion: "v1",
		},
		ObjectMeta: in.options.ToObjectMeta(),
		Spec: corev1.PodSpec{
			RestartPolicy: in.options.RestartPolicy,
			Containers: []corev1.Container{
				{
					Name:         defaultPodContainerName,
					Image:        SwapBaseRegistry(in.options.Registry, in.options.Image),
					Command:      in.options.Command,
					VolumeMounts: in.options.VolumeMounts,
				},
			},
			Volumes: in.options.Volumes,
		},
	}
}

func NewPod(name, namespace string, options ...PodOption) Resource[corev1.Pod] {
	podOptions := &PodOptions{
		Name:          name,
		Namespace:     namespace,
		RestartPolicy: corev1.RestartPolicyNever,
		Image:         BusyboxImage,
	}

	for _, opt := range options {
		opt(podOptions)
	}

	resource := &Pod{
		baseResource: baseResource{
			ObjectMeta: podOptions.ToObjectMeta(),
			typeMeta: metav1.TypeMeta{
				Kind:       "Pod",
				APIVersion: "v1",
			},
		},
		options: podOptions,
	}

	resource.baseResource.setSelf(resource)
	return resource
}
