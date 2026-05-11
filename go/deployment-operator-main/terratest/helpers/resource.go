package helpers

import (
	"encoding/json"
	"fmt"
	"testing"
	"time"

	"github.com/gruntwork-io/terratest/modules/k8s"
	"github.com/samber/lo"
	"github.com/stretchr/testify/require"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	runtimerrors "sigs.k8s.io/controller-runtime/pkg/client"
)

type Resource[T any] interface {
	ResourceBase

	CreateWithCleanup(t *testing.T, timeout time.Duration) error
	DeleteWithTimeout(t *testing.T, timeout time.Duration) error
	Get(t *testing.T) (*T, error)
	WaitForReady(t *testing.T, timeout time.Duration) error
}

type ResourceBase interface {
	Name() string
	Namespace() string
	Create(t *testing.T) error
	Delete(t *testing.T) error
	Exists(t *testing.T) (bool, error)
}

type baseResource struct {
	v1.ObjectMeta

	typeMeta v1.TypeMeta
	self     ResourceBase
}

func (in *baseResource) setSelf(self ResourceBase) {
	in.self = self
}

func (in *baseResource) CreateWithCleanup(t *testing.T, timeout time.Duration) error {
	if in.self == nil {
		return fmt.Errorf("baseResource is missing self reference")
	}

	if err := in.self.Create(t); err != nil {
		return err
	}

	t.Cleanup(func() {
		if err := in.DeleteWithTimeout(t, timeout); err != nil {
			require.Fail(t, "could not delete resource %s/%s", in.GetNamespace(), in.GetName())
		}
	})

	return nil
}

func (in *baseResource) DeleteWithTimeout(t *testing.T, timeout time.Duration) error {
	if in.self == nil {
		return fmt.Errorf("baseResource is missing self reference")
	}

	if err := in.self.Delete(t); err != nil {
		if apierrors.IsNotFound(err) {
			return nil
		}

		return err
	}

	ticker := time.NewTicker(defaultTickerInterval)
	defer ticker.Stop()

	timer := time.NewTimer(timeout)
	defer timer.Stop()

	for {
		select {
		case <-timer.C:
			return fmt.Errorf("timed out waiting for resource to be deleted")
		case <-ticker.C:
			exists, err := in.self.Exists(t)
			if err != nil {
				return runtimerrors.IgnoreNotFound(err)
			}

			if !exists {
				return nil
			}
		}
	}
}

func (in *baseResource) toKubectlOptions() *k8s.KubectlOptions {
	return &k8s.KubectlOptions{
		Namespace: lo.Ternary(in.typeMeta.Kind == "Namespace", in.GetName(), in.GetNamespace()),
	}
}

func (in *baseResource) clientset(t *testing.T) (*kubernetes.Clientset, error) {
	return k8s.GetKubernetesClientFromOptionsE(t, in.toKubectlOptions())
}

func (in *baseResource) toJSON(resource any) string {
	if resource == nil {
		return "{}"
	}

	marshalled, err := json.Marshal(resource)
	if err != nil {
		return "{}"
	}

	return string(marshalled)
}
