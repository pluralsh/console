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
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	runtimerrors "sigs.k8s.io/controller-runtime/pkg/client"
)

type PersistentVolumeClaimOptions struct {
	Name         string
	Namespace    string
	Labels       map[string]any
	Annotations  map[string]any
	StorageClass string
	Size         string
}

func (in *PersistentVolumeClaimOptions) ToObjectMeta() metav1.ObjectMeta {
	return metav1.ObjectMeta{
		Name:        in.Name,
		Namespace:   in.Namespace,
		Labels:      ToStringMap(in.Labels),
		Annotations: ToStringMap(in.Annotations),
	}
}

type PersistentVolumeClaimOption func(*PersistentVolumeClaimOptions)

func WithPersistentVolumeClaimStorageClass(storageClass string) PersistentVolumeClaimOption {
	return func(opts *PersistentVolumeClaimOptions) {
		opts.StorageClass = storageClass
	}
}

func WithPersistentVolumeClaimSize(size string) PersistentVolumeClaimOption {
	return func(opts *PersistentVolumeClaimOptions) {
		opts.Size = size
	}
}

func WithPersistentVolumeClaimLabels(labels map[string]any) PersistentVolumeClaimOption {
	return func(opts *PersistentVolumeClaimOptions) {
		opts.Labels = MergeFlat(opts.Labels, labels)
	}
}

func WithPersistentVolumeClaimAnnotations(annotations map[string]any) PersistentVolumeClaimOption {
	return func(opts *PersistentVolumeClaimOptions) {
		opts.Annotations = MergeFlat(opts.Annotations, annotations)
	}
}

func WithPersistentVolumeClaimDefaults(defaults *client.SentinelCheckIntegrationTestDefaultConfigurationFragment) PersistentVolumeClaimOption {
	return func(opts *PersistentVolumeClaimOptions) {
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

type PersistentVolumeClaim struct {
	baseResource

	options *PersistentVolumeClaimOptions
}

func (in *PersistentVolumeClaim) Name() string {
	return in.options.Name
}

func (in *PersistentVolumeClaim) Namespace() string {
	return in.options.Namespace
}

func (in *PersistentVolumeClaim) Create(t *testing.T) error {
	pvc, err := in.toPersistentVolumeClaim()
	if err != nil {
		return err
	}

	return k8s.KubectlApplyFromStringE(t,
		in.toKubectlOptions(),
		in.toJSON(pvc),
	)
}

func (in *PersistentVolumeClaim) Delete(t *testing.T) error {
	clientset, err := in.clientset(t)
	if err != nil {
		return err
	}

	return runtimerrors.IgnoreNotFound(
		clientset.CoreV1().PersistentVolumeClaims(in.Namespace()).Delete(context.Background(), in.Name(), metav1.DeleteOptions{}),
	)
}

func (in *PersistentVolumeClaim) Get(t *testing.T) (*corev1.PersistentVolumeClaim, error) {
	return k8s.GetPersistentVolumeClaimE(t, in.toKubectlOptions(), in.Name())
}

func (in *PersistentVolumeClaim) Exists(t *testing.T) (bool, error) {
	clientset, err := in.clientset(t)
	if err != nil {
		return false, err
	}

	_, err = clientset.CoreV1().PersistentVolumeClaims(in.Namespace()).Get(context.Background(), in.Name(), metav1.GetOptions{})
	if err != nil {
		if apierrors.IsNotFound(err) {
			return false, nil
		}

		return false, err
	}

	return true, nil
}

func (in *PersistentVolumeClaim) WaitForReady(t *testing.T, timeout time.Duration) error {
	ticker := time.NewTicker(defaultTickerInterval)
	defer ticker.Stop()

	timer := time.NewTimer(timeout)
	defer timer.Stop()

	for {
		select {
		case <-timer.C:
			return fmt.Errorf("timed out waiting for pvc %s/%s to be bound", in.Namespace(), in.Name())
		case <-ticker.C:
			pvc, err := k8s.GetPersistentVolumeClaimE(t, in.toKubectlOptions(), in.Name())
			if err != nil {
				t.Logf("failed to get pvc %s/%s: %v", in.Namespace(), in.Name(), err)
				continue
			}

			if pvc.Status.Phase == corev1.ClaimBound {
				return nil
			}
		}
	}
}

func (in *PersistentVolumeClaim) toPersistentVolumeClaim() (*corev1.PersistentVolumeClaim, error) {
	quantity, err := resource.ParseQuantity(in.options.Size)
	if err != nil {
		return nil, err
	}

	return &corev1.PersistentVolumeClaim{
		TypeMeta: metav1.TypeMeta{
			Kind:       "PersistentVolumeClaim",
			APIVersion: "v1",
		},
		ObjectMeta: in.options.ToObjectMeta(),
		Spec: corev1.PersistentVolumeClaimSpec{
			AccessModes: []corev1.PersistentVolumeAccessMode{corev1.ReadWriteOnce},
			Resources: corev1.VolumeResourceRequirements{
				Requests: corev1.ResourceList{
					corev1.ResourceStorage: quantity,
				},
			},
			StorageClassName: lo.ToPtr(in.options.StorageClass),
		},
	}, nil
}

func NewPersistentVolumeClaim(name, namespace string, options ...PersistentVolumeClaimOption) Resource[corev1.PersistentVolumeClaim] {
	pvcOptions := &PersistentVolumeClaimOptions{
		Name:      name,
		Namespace: namespace,
	}

	for _, opt := range options {
		opt(pvcOptions)
	}

	resource := &PersistentVolumeClaim{
		baseResource: baseResource{
			ObjectMeta: pvcOptions.ToObjectMeta(),
			typeMeta: metav1.TypeMeta{
				Kind:       "PersistentVolumeClaim",
				APIVersion: "v1",
			},
		},
		options: pvcOptions,
	}

	resource.baseResource.setSelf(resource)
	return resource
}
