package helpers

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/gruntwork-io/terratest/modules/k8s"
	"github.com/pluralsh/console/go/client"
	"github.com/samber/lo"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	runtimerrors "sigs.k8s.io/controller-runtime/pkg/client"
)

const (
	defaultDeploymentContainerName = "app"
)

type DeploymentOptions struct {
	Name        string
	Namespace   string
	Labels      map[string]any
	Annotations map[string]any
	Registry    string
	Image       string
	Replicas    int32
	Ports       []corev1.ContainerPort
}

func (in *DeploymentOptions) ToObjectMeta() metav1.ObjectMeta {
	return metav1.ObjectMeta{
		Name:        in.Name,
		Namespace:   in.Namespace,
		Labels:      ToStringMap(in.Labels),
		Annotations: ToStringMap(in.Annotations),
	}
}

type DeploymentOption func(*DeploymentOptions)

func WithDeploymentLabels(labels map[string]any) DeploymentOption {
	return func(opts *DeploymentOptions) {
		opts.Labels = MergeFlat(opts.Labels, labels)
	}
}

func WithDeploymentAnnotations(annotations map[string]any) DeploymentOption {
	return func(opts *DeploymentOptions) {
		opts.Annotations = MergeFlat(opts.Annotations, annotations)
	}
}

func WithDeploymentImage(image string) DeploymentOption {
	return func(opts *DeploymentOptions) {
		opts.Image = image
	}
}

func WithDeploymentPorts(ports []corev1.ContainerPort) DeploymentOption {
	return func(opts *DeploymentOptions) {
		opts.Ports = ports
	}
}

func WithDeploymentDefaults(defaults *client.SentinelCheckIntegrationTestDefaultConfigurationFragment) DeploymentOption {
	return func(opts *DeploymentOptions) {
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

type Deployment struct {
	baseResource

	options *DeploymentOptions
}

func (in *Deployment) Name() string {
	return in.options.Name
}

func (in *Deployment) Namespace() string {
	return in.options.Namespace
}

func (in *Deployment) Create(t *testing.T) error {
	return k8s.KubectlApplyFromStringE(t,
		in.toKubectlOptions(),
		in.toJSON(in.toDeployment()),
	)
}

func (in *Deployment) Delete(t *testing.T) error {
	clientset, err := in.clientset(t)
	if err != nil {
		return err
	}

	return runtimerrors.IgnoreNotFound(
		clientset.AppsV1().Deployments(in.Namespace()).Delete(context.Background(), in.Name(), metav1.DeleteOptions{}),
	)
}

func (in *Deployment) Get(t *testing.T) (*appsv1.Deployment, error) {
	return k8s.GetDeploymentE(t, in.toKubectlOptions(), in.Name())
}

func (in *Deployment) Exists(t *testing.T) (bool, error) {
	_, err := k8s.GetDeploymentE(t, in.toKubectlOptions(), in.Name())
	if err != nil {
		return false, runtimerrors.IgnoreNotFound(err)
	}

	return true, nil
}

func (in *Deployment) WaitForReady(t *testing.T, timeout time.Duration) error {
	ticker := time.NewTicker(defaultTickerInterval)
	defer ticker.Stop()

	timer := time.NewTimer(timeout)
	defer timer.Stop()

	for {
		select {
		case <-timer.C:
			return fmt.Errorf("timeout waiting for deployment %s/%s to be ready", in.Namespace(), in.Name())
		case <-ticker.C:
			deployment, err := k8s.GetDeploymentE(t, in.toKubectlOptions(), in.Name())
			if err != nil {
				t.Logf("failed to get deployment %s/%s: %v", in.Namespace(), in.Name(), err)
				continue
			}

			desired := int32(0)
			if deployment.Spec.Replicas != nil {
				desired = *deployment.Spec.Replicas
			}

			if deployment.Status.AvailableReplicas >= desired {
				return nil
			}
		}
	}
}

func (in *Deployment) toDeployment() *appsv1.Deployment {
	replicas := in.options.Replicas

	labels := ToStringMap(in.options.Labels)

	return &appsv1.Deployment{
		TypeMeta: metav1.TypeMeta{
			Kind:       "Deployment",
			APIVersion: "apps/v1",
		},
		ObjectMeta: in.options.ToObjectMeta(),
		Spec: appsv1.DeploymentSpec{
			Replicas: &replicas,
			Selector: &metav1.LabelSelector{MatchLabels: labels},
			Template: corev1.PodTemplateSpec{
				ObjectMeta: metav1.ObjectMeta{Labels: labels},
				Spec: corev1.PodSpec{
					Containers: []corev1.Container{
						{
							Name:  defaultDeploymentContainerName,
							Image: SwapBaseRegistry(in.options.Registry, in.options.Image),
							Ports: in.options.Ports,
						},
					},
				},
			},
		},
	}
}

func NewDeployment(name, namespace string, options ...DeploymentOption) Resource[appsv1.Deployment] {
	deploymentOptions := &DeploymentOptions{
		Name:      name,
		Namespace: namespace,
		Replicas:  1,
	}

	for _, opt := range options {
		opt(deploymentOptions)
	}

	resource := &Deployment{
		baseResource: baseResource{
			ObjectMeta: deploymentOptions.ToObjectMeta(),
			typeMeta: metav1.TypeMeta{
				Kind:       "Deployment",
				APIVersion: "apps/v1",
			},
		},
		options: deploymentOptions,
	}

	resource.baseResource.setSelf(resource)
	return resource
}
