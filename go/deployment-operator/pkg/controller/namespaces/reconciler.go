package namespaces

import (
	"context"
	"fmt"
	"maps"
	"reflect"
	"time"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/polly/algorithms"
	"github.com/pluralsh/console/go/polly/cache"
	v1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/util/workqueue"
	ctrlclient "sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	clienterrors "github.com/pluralsh/deployment-operator/internal/errors"
	"github.com/pluralsh/deployment-operator/internal/utils"
	"github.com/pluralsh/deployment-operator/pkg/client"
	"github.com/pluralsh/deployment-operator/pkg/controller/common"
	"github.com/pluralsh/deployment-operator/pkg/websocket"
)

const (
	Identifier = "Namespace Controller"
)

type NamespaceReconciler struct {
	consoleClient  client.Client
	k8sClient      ctrlclient.Client
	namespaceQueue workqueue.TypedRateLimitingInterface[string]
	namespaceCache *cache.Cache[console.ManagedNamespaceFragment]
	pollInterval   time.Duration
}

func NewNamespaceReconciler(consoleClient client.Client, k8sClient ctrlclient.Client, refresh, pollInterval time.Duration) *NamespaceReconciler {
	return &NamespaceReconciler{
		consoleClient:  consoleClient,
		k8sClient:      k8sClient,
		namespaceQueue: workqueue.NewTypedRateLimitingQueue(workqueue.DefaultTypedControllerRateLimiter[string]()),
		namespaceCache: cache.NewCache[console.ManagedNamespaceFragment](refresh, func(id string) (*console.ManagedNamespaceFragment, error) {
			return consoleClient.GetNamespace(id)
		}),
		pollInterval: pollInterval,
	}
}

func (n *NamespaceReconciler) Queue() workqueue.TypedRateLimitingInterface[string] {
	return n.namespaceQueue
}

func (n *NamespaceReconciler) Restart() {
	// Cleanup
	n.namespaceQueue.ShutDown()
	n.namespaceCache.Wipe()

	// Initialize
	n.namespaceQueue = workqueue.NewTypedRateLimitingQueue(workqueue.DefaultTypedControllerRateLimiter[string]())
}

func (n *NamespaceReconciler) Shutdown() {
	n.namespaceQueue.ShutDown()
	n.namespaceCache.Wipe()
}

func (n *NamespaceReconciler) GetPollInterval() func() time.Duration {
	return func() time.Duration { return n.pollInterval } // use default poll interval
}

func (n *NamespaceReconciler) GetPublisher() (string, websocket.Publisher) {
	return "namespace", &socketPublisher{
		restoreQueue: n.namespaceQueue,
		restoreCache: n.namespaceCache,
	}
}

func (n *NamespaceReconciler) WipeCache() {
	n.namespaceCache.Wipe()
}

func (n *NamespaceReconciler) ShutdownQueue() {
	n.namespaceQueue.ShutDown()
}

func (n *NamespaceReconciler) ListNamespaces(ctx context.Context) *algorithms.Pager[*console.ManagedNamespaceEdgeFragment] {
	logger := log.FromContext(ctx)
	logger.V(4).Info("create namespace pager")
	fetch := func(page *string, size int64) ([]*console.ManagedNamespaceEdgeFragment, *algorithms.PageInfo, error) {
		resp, err := n.consoleClient.ListNamespaces(page, &size)
		if err != nil {
			logger.Error(err, "failed to fetch namespaces")
			return nil, nil, err
		}
		pageInfo := &algorithms.PageInfo{
			HasNext:  resp.PageInfo.HasNextPage,
			After:    resp.PageInfo.EndCursor,
			PageSize: size,
		}
		return resp.Edges, pageInfo, nil
	}
	return algorithms.NewPager[*console.ManagedNamespaceEdgeFragment](common.DefaultPageSize, fetch)
}

func (n *NamespaceReconciler) Poll(ctx context.Context) error {
	logger := log.FromContext(ctx)
	logger.V(4).Info("fetching namespaces")
	pager := n.ListNamespaces(ctx)

	for pager.HasNext() {
		namespaces, err := pager.NextPage()
		if err != nil {
			logger.Error(err, "failed to fetch namespace list")
			return err
		}
		for _, namespace := range namespaces {
			logger.Info("sending update for", "namespace", namespace.Node.ID)
			n.namespaceQueue.Add(namespace.Node.ID)
		}
	}

	return nil
}

func (n *NamespaceReconciler) Reconcile(ctx context.Context, id string) (reconcile.Result, error) {
	logger := log.FromContext(ctx)
	logger.Info("attempting to sync namespace", "id", id)
	namespace, err := n.namespaceCache.Get(id)
	if err != nil {
		if clienterrors.IsNotFound(err) {
			logger.Info("namespace already deleted", "id", id)
			return reconcile.Result{}, nil
		}
		logger.Error(err, fmt.Sprintf("failed to fetch namespace: %s, ignoring for now", id))
		return reconcile.Result{}, err
	}
	logger.Info("upsert namespace", "name", namespace.Name)
	if err = n.UpsertNamespace(ctx, namespace); err != nil {
		return reconcile.Result{}, err
	}

	return reconcile.Result{}, nil
}

func (n *NamespaceReconciler) UpsertNamespace(ctx context.Context, fragment *console.ManagedNamespaceFragment) error {
	var labels map[string]string
	var annotations map[string]string
	createNamespace := true

	if fragment.Labels != nil {
		labels = utils.ConvertMap(fragment.Labels)
	}
	if fragment.Annotations != nil {
		annotations = utils.ConvertMap(fragment.Annotations)
	}
	if fragment.Service != nil && fragment.Service.SyncConfig != nil {
		if fragment.Service.SyncConfig.NamespaceMetadata != nil {
			maps.Copy(labels, utils.ConvertMap(fragment.Service.SyncConfig.NamespaceMetadata.Labels))
			maps.Copy(annotations, utils.ConvertMap(fragment.Service.SyncConfig.NamespaceMetadata.Annotations))
		}
		if fragment.Service.SyncConfig.CreateNamespace != nil {
			createNamespace = *fragment.Service.SyncConfig.CreateNamespace
		}
	}

	if createNamespace {
		existing := &v1.Namespace{}
		err := n.k8sClient.Get(ctx, ctrlclient.ObjectKey{Name: fragment.Name}, existing)
		if err != nil {
			if apierrors.IsNotFound(err) {
				if err := n.k8sClient.Create(ctx, &v1.Namespace{
					ObjectMeta: metav1.ObjectMeta{
						Name:        fragment.Name,
						Labels:      labels,
						Annotations: annotations,
					},
				}); err != nil {
					return err
				}
				return nil
			}
			return err
		}

		// update labels and annotations
		if !reflect.DeepEqual(labels, existing.Labels) || !reflect.DeepEqual(annotations, existing.Annotations) {
			existing.Labels = labels
			existing.Annotations = annotations
			if err := n.k8sClient.Update(ctx, existing); err != nil {
				return err
			}
		}
	}
	return nil
}
