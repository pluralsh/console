package common

import (
	"fmt"
	"time"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/deployment-operator/internal/utils"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"sigs.k8s.io/yaml"

	"github.com/pluralsh/console/go/deployment-operator/cmd/agent/args"
)

const (
	GitSigningKeyMountPath = "/plural/git/git-signing.key"

	ManagedByLabel  = "plural.sh/managed-by"
	AgentLabelValue = "agent"
)

func ToUnstructured(obj runtime.Object) (*unstructured.Unstructured, error) {
	objMap, err := runtime.DefaultUnstructuredConverter.ToUnstructured(obj)
	if err != nil {
		return nil, err
	}

	return &unstructured.Unstructured{Object: objMap}, nil
}

func ComponentAttributesKey(c console.ComponentAttributes) string {
	return fmt.Sprintf("%s/%s/%s/%s/%s", c.Group, c.Version, c.Kind, c.Name, c.Namespace)
}

func GetResourceVersion(obj runtime.Object, fallbackResourceVersion string) string {
	if obj == nil {
		return fallbackResourceVersion
	}

	resource, err := ToUnstructured(obj)
	if err != nil {
		return fallbackResourceVersion
	}

	return resource.GetResourceVersion()
}

func Unmarshal(s string) (map[string]interface{}, error) {
	result := make(map[string]interface{})
	if err := yaml.Unmarshal([]byte(s), &result); err != nil {
		return nil, err
	}

	return result, nil
}

// WithJitter adds a random jitter to the interval based on the global jitter factor.
func WithJitter(interval time.Duration) time.Duration {
	return WithJitterFactor(interval, args.JitterFactor())
}

// WithJitterFactor adds random jitter up to factor of interval in either direction.
// Factor must be in the range [0, 1]; zero leaves the interval unchanged.
func WithJitterFactor(interval time.Duration, factor float64) time.Duration {
	return utils.WithJitterFactor(interval, factor)
}
