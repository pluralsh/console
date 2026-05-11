package helpers

import (
	"testing"
	"time"

	"github.com/gruntwork-io/terratest/modules/k8s"
	"github.com/pluralsh/console/go/client"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	runtimerrors "sigs.k8s.io/controller-runtime/pkg/client"
)

type NamespaceOptions struct {
	Name        string
	Labels      map[string]any
	Annotations map[string]any
}

func (in *NamespaceOptions) ToObjectMeta() v1.ObjectMeta {
	return v1.ObjectMeta{
		Name:        in.Name,
		Labels:      ToStringMap(in.Labels),
		Annotations: ToStringMap(in.Annotations),
	}
}

type NamespaceOption func(*NamespaceOptions)

func WithNamespaceDefaults(defaults *client.SentinelCheckIntegrationTestDefaultConfigurationFragment) NamespaceOption {
	return func(opts *NamespaceOptions) {
		if defaults == nil {
			return
		}

		if defaults.NamespaceLabels != nil {
			opts.Labels = MergeFlat(opts.Labels, defaults.NamespaceLabels)
		}

		if defaults.NamespaceAnnotations != nil {
			opts.Annotations = MergeFlat(opts.Annotations, defaults.NamespaceAnnotations)
		}
	}
}

type Namespace struct {
	baseResource
}

func (in *Namespace) Name() string {
	return in.GetName()
}

func (in *Namespace) Namespace() string {
	return in.Name()
}

func (in *Namespace) Create(t *testing.T) error {
	err := k8s.CreateNamespaceWithMetadataE(t, in.toKubectlOptions(), in.ObjectMeta)

	if err != nil && !apierrors.IsAlreadyExists(err) {
		return err
	}

	return nil
}

func (in *Namespace) Delete(t *testing.T) error {
	err := k8s.DeleteNamespaceE(t, in.toKubectlOptions(), in.Name())

	if err != nil && !apierrors.IsNotFound(err) {
		return err
	}

	return nil
}

func (in *Namespace) Get(t *testing.T) (*corev1.Namespace, error) {
	return k8s.GetNamespaceE(t, in.toKubectlOptions(), in.Name())
}

func (in *Namespace) Exists(t *testing.T) (bool, error) {
	_, err := k8s.GetNamespaceE(t, in.toKubectlOptions(), in.Name())
	if err != nil {
		return false, runtimerrors.IgnoreNotFound(err)
	}

	return true, nil
}

func (in *Namespace) WaitForReady(_ *testing.T, _ time.Duration) error {
	return nil
}

func NewNamespace(name string, options ...NamespaceOption) Resource[corev1.Namespace] {
	namespaceOptions := &NamespaceOptions{Name: name}

	for _, opt := range options {
		opt(namespaceOptions)
	}

	resource := &Namespace{
		baseResource: baseResource{
			ObjectMeta: namespaceOptions.ToObjectMeta(),
			typeMeta: v1.TypeMeta{
				Kind:       "Namespace",
				APIVersion: "v1",
			},
		},
	}

	resource.baseResource.setSelf(resource)
	return resource
}
