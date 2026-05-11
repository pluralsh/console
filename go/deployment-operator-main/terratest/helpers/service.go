package helpers

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/gruntwork-io/terratest/modules/k8s"
	"github.com/pluralsh/console/go/client"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	runtimerrors "sigs.k8s.io/controller-runtime/pkg/client"
)

type ServiceOptions struct {
	Name        string
	Namespace   string
	Selector    map[string]any
	Labels      map[string]any
	Annotations map[string]any
	Ports       []corev1.ServicePort
	Type        corev1.ServiceType
}

func (in *ServiceOptions) ToObjectMeta() metav1.ObjectMeta {
	mergedLabels := MergeFlat(in.Selector, in.Labels)

	return metav1.ObjectMeta{
		Name:        in.Name,
		Namespace:   in.Namespace,
		Labels:      ToStringMap(mergedLabels),
		Annotations: ToStringMap(in.Annotations),
	}
}

type ServiceOption func(*ServiceOptions)

func WithServiceDefaults(defaults *client.SentinelCheckIntegrationTestDefaultConfigurationFragment) ServiceOption {
	return func(opts *ServiceOptions) {
		if defaults == nil {
			return
		}

		if defaults.ResourceLabels != nil {
			opts.Labels = MergeFlat(opts.Labels, defaults.ResourceLabels)
		}

		if defaults.ResourceAnnotations != nil {
			opts.Annotations = MergeFlat(opts.Annotations, defaults.ResourceAnnotations)
		}
	}
}

func WithServiceSelector(selector map[string]any) ServiceOption {
	return func(opts *ServiceOptions) {
		opts.Selector = selector
	}
}

func WithServiceLabels(labels map[string]any) ServiceOption {
	return func(opts *ServiceOptions) {
		opts.Labels = MergeFlat(opts.Labels, labels)
	}
}

func WithServiceAnnotations(annotations map[string]any) ServiceOption {
	return func(opts *ServiceOptions) {
		opts.Annotations = MergeFlat(opts.Annotations, annotations)
	}
}

func WithServicePorts(port ...corev1.ServicePort) ServiceOption {
	return func(opts *ServiceOptions) {
		opts.Ports = port
	}
}

func WithServiceType(serviceType corev1.ServiceType) ServiceOption {
	return func(opts *ServiceOptions) {
		opts.Type = serviceType
	}
}

type Service struct {
	baseResource

	options *ServiceOptions
}

func (in *Service) Name() string {
	return in.options.Name
}

func (in *Service) Namespace() string {
	return in.options.Namespace
}

func (in *Service) Create(t *testing.T) error {
	return k8s.KubectlApplyFromStringE(t,
		in.toKubectlOptions(),
		in.toJSON(in.toService()),
	)
}

func (in *Service) Delete(t *testing.T) error {
	clientset, err := in.clientset(t)
	if err != nil {
		return err
	}

	return runtimerrors.IgnoreNotFound(
		clientset.CoreV1().Services(in.Namespace()).Delete(context.Background(), in.Name(), metav1.DeleteOptions{}),
	)
}

func (in *Service) Get(t *testing.T) (*corev1.Service, error) {
	return k8s.GetServiceE(t, in.toKubectlOptions(), in.Name())
}

func (in *Service) Exists(t *testing.T) (bool, error) {
	_, err := k8s.GetServiceE(t, in.toKubectlOptions(), in.Name())
	if err != nil {
		return false, runtimerrors.IgnoreNotFound(err)
	}

	return true, nil
}

func (in *Service) WaitForReady(t *testing.T, timeout time.Duration) error {
	ticker := time.NewTicker(defaultTickerInterval)
	defer ticker.Stop()

	timer := time.NewTimer(timeout)
	defer timer.Stop()

	for {
		select {
		case <-timer.C:
			return fmt.Errorf("timeout waiting for load balancer service %s/%s to be ready", in.Namespace(), in.Name())
		case <-ticker.C:
			service, err := k8s.GetServiceE(t, in.toKubectlOptions(), in.Name())
			if err != nil {
				t.Logf("failed to get service %s/%s: %v", in.Namespace(), in.Name(), err)
				continue
			}

			if service.Spec.Type != corev1.ServiceTypeLoadBalancer {
				return nil
			}

			if len(service.Status.LoadBalancer.Ingress) > 0 {
				return nil
			}
		}
	}
}

func (in *Service) toService() *corev1.Service {
	return &corev1.Service{
		TypeMeta:   in.typeMeta,
		ObjectMeta: in.options.ToObjectMeta(),
		Spec: corev1.ServiceSpec{
			Type:     in.options.Type,
			Selector: ToStringMap(in.options.Selector),
			Ports:    in.options.Ports,
		},
	}
}

func NewService(name, namespace string, options ...ServiceOption) Resource[corev1.Service] {
	serviceOptions := &ServiceOptions{
		Name:      name,
		Namespace: namespace,
	}

	for _, opt := range options {
		opt(serviceOptions)
	}

	resource := &Service{
		baseResource: baseResource{
			ObjectMeta: serviceOptions.ToObjectMeta(),
			typeMeta: metav1.TypeMeta{
				Kind:       "Service",
				APIVersion: "v1",
			},
		},
		options: serviceOptions,
	}

	resource.baseResource.setSelf(resource)
	return resource
}
