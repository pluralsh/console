package helpers

import (
	"context"
	"fmt"
	"io"
	"strings"
	"testing"
	"time"

	"github.com/gruntwork-io/terratest/modules/k8s"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	k8syaml "k8s.io/apimachinery/pkg/util/yaml"
	"k8s.io/client-go/discovery"
	"k8s.io/client-go/discovery/cached/memory"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/restmapper"
)

type MetaOnly struct {
	Metadata struct {
		Namespace string `yaml:"namespace"`
	} `yaml:"metadata"`
}

type RawResourceList []unstructured.Unstructured

func (in RawResourceList) WaitUntilReady(t *testing.T, timeout time.Duration) {
	for _, resource := range in {
		(RawResource{resource}).WaitUntilReady(t, timeout)
	}
}

func (in RawResourceList) decode(yaml string) (RawResourceList, error) {
	decoder := k8syaml.NewYAMLOrJSONDecoder(strings.NewReader(yaml), 4096)
	resources := make([]unstructured.Unstructured, 0)

	for {
		raw := make(map[string]any)
		if err := decoder.Decode(&raw); err != nil {
			if err == io.EOF {
				break
			}

			return nil, err
		}

		if len(raw) == 0 {
			continue
		}

		resource := unstructured.Unstructured{Object: raw}
		if resource.IsList() {
			list := &unstructured.UnstructuredList{}
			list.SetUnstructuredContent(raw)
			resources = append(resources, list.Items...)
		} else {
			resources = append(resources, resource)
		}
	}

	if len(resources) == 0 {
		return nil, fmt.Errorf("no resources found in yaml")
	}

	return resources, nil
}

func NewRawResourceList(yaml string) (RawResourceList, error) {
	resources := make(RawResourceList, 0)
	return resources.decode(yaml)
}

type RawResource struct {
	unstructured.Unstructured
}

func (in RawResource) WaitUntilReady(t *testing.T, timeout time.Duration) {
	kind := strings.ToLower(in.GetKind())
	name := in.GetName()

	if kind == "" || name == "" {
		t.Fatalf("invalid resource: kind(%q), name(%q)", kind, name)
	}

	options := k8s.NewKubectlOptions("", "", in.GetNamespace())
	retries := int(timeout / defaultTickerInterval)

	switch kind {
	case "pod":
		k8s.WaitUntilPodAvailable(t, options, name, retries, defaultTickerInterval)
	case "deployment":
		k8s.WaitUntilDeploymentAvailable(t, options, name, retries, defaultTickerInterval)
	case "job":
		k8s.WaitUntilJobSucceed(t, options, name, retries, defaultTickerInterval)
	case "cronjob":
		k8s.WaitUntilCronJobSucceed(t, options, name, retries, defaultTickerInterval)
	case "service":
		k8s.WaitUntilServiceAvailable(t, options, name, retries, defaultTickerInterval)
	case "ingress":
		k8s.WaitUntilIngressAvailable(t, options, name, retries, defaultTickerInterval)
	case "persistentvolumeclaim":
		bound := corev1.ClaimBound
		k8s.WaitUntilPersistentVolumeClaimInStatus(t, options, name, &bound, retries, defaultTickerInterval)
	case "persistentvolume":
		available := corev1.VolumeAvailable
		k8s.WaitUntilPersistentVolumeInStatus(t, options, name, &available, retries, defaultTickerInterval)
	case "configmap":
		k8s.WaitUntilConfigMapAvailable(t, options, name, retries, defaultTickerInterval)
	case "secret":
		k8s.WaitUntilSecretAvailable(t, options, name, retries, defaultTickerInterval)
	case "networkpolicy":
		k8s.WaitUntilNetworkPolicyAvailable(t, options, name, retries, defaultTickerInterval)
	default:
		in.waitUntilReadyByCondition(t, options, timeout)
	}
}

func (in RawResource) waitUntilReadyByCondition(t *testing.T, options *k8s.KubectlOptions, timeout time.Duration) {
	ticker := time.NewTicker(defaultTickerInterval)
	defer ticker.Stop()

	timer := time.NewTimer(timeout)
	defer timer.Stop()

	dynamicClient, mapper, err := dynamicClientAndMapper(t, options)
	if err != nil {
		t.Fatalf("failed to get dynamic client: %v", err)
		return
	}

	for {
		select {
		case <-timer.C:
			t.Fatalf("timed out waiting for %s %s/%s to be ready", in.GetKind(), in.GetNamespace(), in.GetName())
		case <-ticker.C:
			ready, err := in.isReadyByCondition(dynamicClient, mapper)
			if err != nil {
				t.Logf("failed to check readiness for %s %s/%s: %v", in.GetKind(), in.GetNamespace(), in.GetName(), err)
				continue
			}

			if ready {
				return
			}
		}
	}
}

func (in RawResource) isReadyByCondition(dynamicClient dynamic.Interface, mapper meta.RESTMapper) (bool, error) {
	gvk := schema.FromAPIVersionAndKind(in.GetAPIVersion(), in.GetKind())
	mapping, err := mapper.RESTMapping(gvk.GroupKind(), gvk.Version)
	if err != nil {
		return false, err
	}

	var client dynamic.ResourceInterface
	client = dynamicClient.Resource(mapping.Resource)
	if mapping.Scope.Name() == meta.RESTScopeNameNamespace {
		client = dynamicClient.Resource(mapping.Resource).Namespace(in.GetNamespace())
	}

	obj, err := client.Get(context.Background(), in.GetName(), metav1.GetOptions{})
	if err != nil {
		if apierrors.IsNotFound(err) {
			return false, nil
		}

		return false, err
	}

	ready, err := hasReadyCondition(obj)
	if err != nil {
		return false, err
	}

	return ready, nil
}

func dynamicClientAndMapper(t *testing.T, options *k8s.KubectlOptions) (dynamic.Interface, meta.RESTMapper, error) {
	config, err := restConfigFromOptions(t, options)
	if err != nil {
		return nil, nil, err
	}

	dynamicClient, err := dynamic.NewForConfig(config)
	if err != nil {
		return nil, nil, err
	}

	discoveryClient, err := discovery.NewDiscoveryClientForConfig(config)
	if err != nil {
		return nil, nil, err
	}

	mapper := restmapper.NewDeferredDiscoveryRESTMapper(memory.NewMemCacheClient(discoveryClient))
	return dynamicClient, mapper, nil
}

func restConfigFromOptions(t *testing.T, options *k8s.KubectlOptions) (*rest.Config, error) {
	if options.InClusterAuth {
		return rest.InClusterConfig()
	}

	if options.RestConfig != nil {
		return options.RestConfig, nil
	}

	kubeConfigPath, err := options.GetConfigPath(t)
	if err != nil {
		return nil, err
	}

	config, err := k8s.LoadApiClientConfigE(kubeConfigPath, options.ContextName)
	if err != nil {
		t.Logf("failed to load kubeconfig: %v, falling back to in-cluster config", err)
		return rest.InClusterConfig()
	}

	return config, nil
}

func hasReadyCondition(obj *unstructured.Unstructured) (bool, error) {
	conditions, found, err := unstructured.NestedSlice(obj.Object, "status", "conditions")
	if err != nil || !found {
		return false, fmt.Errorf("missing status.conditions")
	}

	for _, condition := range conditions {
		conditionMap, ok := condition.(map[string]any)
		if !ok {
			continue
		}

		conditionType, _ := conditionMap["type"].(string)
		if !strings.EqualFold(conditionType, "Ready") {
			continue
		}

		status, _ := conditionMap["status"].(string)
		if strings.EqualFold(status, "True") {
			return true, nil
		}

		reason, _ := conditionMap["reason"].(string)
		message, _ := conditionMap["message"].(string)
		return false, fmt.Errorf("ready=%s reason=%s message=%s", status, reason, message)
	}

	return false, fmt.Errorf("no ready condition found")
}
