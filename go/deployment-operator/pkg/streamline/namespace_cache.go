package streamline

import (
	"context"
	"encoding/json"

	cmap "github.com/orcaman/concurrent-map/v2"
	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/deployment-operator/internal/utils"
	"github.com/pluralsh/deployment-operator/pkg/common"
	"github.com/pluralsh/deployment-operator/pkg/log"
	streamcommon "github.com/pluralsh/deployment-operator/pkg/streamline/common"
	"github.com/samber/lo"
	v1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/apimachinery/pkg/watch"
	v2 "k8s.io/client-go/applyconfigurations/core/v1"
	v3 "k8s.io/client-go/applyconfigurations/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/klog/v2"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

type NamespaceCache interface {
	// HandleNamespaceEvent handles namespace events to keep the namespace cache in sync with the cluster state.
	HandleNamespaceEvent(e watch.Event)

	// EnsureNamespace ensures that the namespace exists with the desired metadata.
	// It can be a no-op based on the provided sync config.
	EnsureNamespace(ctx context.Context, namespace string, syncConfig *console.ServiceDeploymentForAgent_SyncConfig) error

	// DeleteNamespace deletes the namespace.
	// It can be a no-op based on the provided sync config.
	DeleteNamespace(ctx context.Context, namespace string, syncConfig *console.ServiceDeploymentForAgent_SyncConfig) error
}

func NewNamespaceCache(client kubernetes.Interface) NamespaceCache {
	return &namespaceCache{
		cache:  cmap.New[unstructured.Unstructured](),
		client: client,
	}
}

type namespaceCache struct {
	cache  cmap.ConcurrentMap[string, unstructured.Unstructured]
	client kubernetes.Interface
}

func (in *namespaceCache) storeNamespace(n *v1.Namespace) error {
	u, err := runtime.DefaultUnstructuredConverter.ToUnstructured(n)
	if err != nil {
		return err
	}

	in.cache.Set(n.Namespace, unstructured.Unstructured{Object: u})
	return nil
}

func (in *namespaceCache) HandleNamespaceEvent(e watch.Event) {
	if e.Object == nil {
		klog.V(log.LogLevelDebug).InfoS("skipping namespace event with nil object", "event", e)
		return
	}

	resource, err := common.ToUnstructured(e.Object)
	if err != nil {
		klog.V(log.LogLevelDebug).InfoS("skipping namespace event with invalid object", "event", e, "error", err)
		return
	}

	if resource.GetKind() != "Namespace" {
		klog.V(log.LogLevelDebug).InfoS("skipping namespace event with invalid object kind", "event", e)
		return
	}

	switch e.Type {
	case watch.Added, watch.Modified:
		in.cache.Set(resource.GetName(), *resource)
	case watch.Deleted:
		in.cache.Remove(resource.GetName())
	}
}

func (in *namespaceCache) EnsureNamespace(ctx context.Context, namespace string, syncConfig *console.ServiceDeploymentForAgent_SyncConfig) error {
	// Skip namespace applies if the namespace name is empty.
	if namespace == "" {
		return nil
	}

	// Skip namespace applies if sync config was defined and `CreateNamespace` is set to false.
	if syncConfig != nil && syncConfig.CreateNamespace != nil && !*syncConfig.CreateNamespace {
		return nil
	}

	labels, annotations := getNamespaceMetadata(syncConfig)
	cachedNamespace, ok := in.cache.Get(namespace)
	if !ok {
		appliedNamespace, err := in.client.CoreV1().Namespaces().Apply(ctx,
			&v2.NamespaceApplyConfiguration{
				TypeMetaApplyConfiguration: v3.TypeMetaApplyConfiguration{
					Kind:       lo.ToPtr("Namespace"),
					APIVersion: lo.ToPtr("v1"),
				},
				ObjectMetaApplyConfiguration: &v3.ObjectMetaApplyConfiguration{
					Name:        &namespace,
					Labels:      labels,
					Annotations: annotations,
				},
			},
			metav1.ApplyOptions{
				FieldManager: streamcommon.ClientFieldManager,
			})
		if err != nil {
			return err
		}

		return in.storeNamespace(appliedNamespace)
	}

	if !utils.MapIncludes(cachedNamespace.GetAnnotations(), annotations) || !utils.MapIncludes(cachedNamespace.GetLabels(), labels) {
		patch, err := json.Marshal(map[string]any{"metadata": map[string]any{"labels": labels, "annotations": annotations}})
		if err != nil {
			return err
		}

		patchedNamespace, err := in.client.CoreV1().Namespaces().Patch(ctx, namespace, types.MergePatchType, patch, metav1.PatchOptions{})
		if err != nil {
			return err
		}

		return in.storeNamespace(patchedNamespace)
	}

	return nil
}

func (in *namespaceCache) DeleteNamespace(ctx context.Context, namespace string, syncConfig *console.ServiceDeploymentForAgent_SyncConfig) error {
	// Skip namespace deletion if the namespace name is empty.
	if namespace == "" {
		return nil
	}

	// Skip namespace deletion if sync config was not specified or if `DeleteNamespace` is set to false.
	if syncConfig == nil || syncConfig.DeleteNamespace == nil || !*syncConfig.DeleteNamespace {
		return nil
	}

	return client.IgnoreNotFound(in.client.CoreV1().Namespaces().Delete(ctx, namespace, metav1.DeleteOptions{
		GracePeriodSeconds: lo.ToPtr(int64(0)),
		PropagationPolicy:  lo.ToPtr(metav1.DeletePropagationBackground),
	}))
}

func getNamespaceMetadata(syncConfig *console.ServiceDeploymentForAgent_SyncConfig) (labels, annotations map[string]string) {
	if syncConfig != nil && syncConfig.NamespaceMetadata != nil {
		labels = utils.ConvertMap(syncConfig.NamespaceMetadata.Labels)
		annotations = utils.ConvertMap(syncConfig.NamespaceMetadata.Annotations)
	}

	return
}
