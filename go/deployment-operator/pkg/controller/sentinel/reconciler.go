package sentinel

import (
	"context"
	"fmt"
	"time"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/polly/algorithms"
	"github.com/pluralsh/console/go/polly/cache"
	"github.com/pluralsh/deployment-operator/api/v1alpha1"
	"github.com/pluralsh/deployment-operator/pkg/streamline"
	"github.com/samber/lo"
	batchv1 "k8s.io/api/batch/v1"
	apierrs "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/client-go/util/workqueue"
	ctrlclient "sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	clienterrors "github.com/pluralsh/deployment-operator/internal/errors"
	"github.com/pluralsh/deployment-operator/internal/utils"
	"github.com/pluralsh/deployment-operator/pkg/client"
	pkgcommon "github.com/pluralsh/deployment-operator/pkg/common"
	"github.com/pluralsh/deployment-operator/pkg/controller/common"
	"github.com/pluralsh/deployment-operator/pkg/websocket"
)

const (
	Identifier = "Sentinel Controller"
)

type SentinelReconciler struct {
	consoleClient  client.Client
	k8sClient      ctrlclient.Client
	scheme         *runtime.Scheme
	sentinelQueue  workqueue.TypedRateLimitingInterface[string]
	sentinelCache  *cache.Cache[console.SentinelRunJobFragment]
	namespace      string
	consoleURL     string
	deployToken    string
	pollInterval   time.Duration
	namespaceCache streamline.NamespaceCache
}

func NewSentinelReconciler(namespaceCache streamline.NamespaceCache, consoleClient client.Client, k8sClient ctrlclient.Client, scheme *runtime.Scheme, refresh, pollInterval time.Duration, namespace, consoleURL, deployToken string) *SentinelReconciler {
	return &SentinelReconciler{
		consoleClient: consoleClient,
		k8sClient:     k8sClient,
		scheme:        scheme,
		sentinelQueue: workqueue.NewTypedRateLimitingQueue(workqueue.DefaultTypedControllerRateLimiter[string]()),
		sentinelCache: cache.NewCache[console.SentinelRunJobFragment](refresh, func(id string) (*console.SentinelRunJobFragment, error) {
			return consoleClient.GetSentinelRunJob(id)
		}),
		consoleURL:     consoleURL,
		deployToken:    deployToken,
		pollInterval:   pollInterval,
		namespace:      namespace,
		namespaceCache: namespaceCache,
	}
}

func (r *SentinelReconciler) Queue() workqueue.TypedRateLimitingInterface[string] {
	return r.sentinelQueue
}

func (r *SentinelReconciler) Restart() {
	// Cleanup
	r.sentinelQueue.ShutDown()
	r.sentinelCache.Wipe()

	// Initialize
	r.sentinelQueue = workqueue.NewTypedRateLimitingQueue(workqueue.DefaultTypedControllerRateLimiter[string]())
}

func (r *SentinelReconciler) Shutdown() {
	r.sentinelQueue.ShutDown()
	r.sentinelCache.Wipe()
}

func (r *SentinelReconciler) GetPollInterval() func() time.Duration {
	return func() time.Duration {
		return r.pollInterval
	}
}

func (r *SentinelReconciler) GetPublisher() (string, websocket.Publisher) {
	return "sentinel_run", &socketPublisher{
		sentinelRunQueue: r.sentinelQueue,
		sentinelRunCache: r.sentinelCache,
	}
}

func (r *SentinelReconciler) WipeCache() {
	r.sentinelCache.Wipe()
}

func (r *SentinelReconciler) ShutdownQueue() {
	r.sentinelQueue.ShutDown()
}

func (r *SentinelReconciler) ListSentinelRunJobs(ctx context.Context) *algorithms.Pager[*console.ListClusterSentinelRunJobs_ClusterSentinelRunJobs_Edges] {
	logger := log.FromContext(ctx)
	logger.V(4).Info("create sentinel run pager")
	fetch := func(page *string, size int64) ([]*console.ListClusterSentinelRunJobs_ClusterSentinelRunJobs_Edges, *algorithms.PageInfo, error) {
		resp, err := r.consoleClient.ListClusterSentinelRunJobs(page, &size)
		if err != nil {
			logger.Error(err, "failed to fetch sentinel run job")
			return nil, nil, err
		}
		pageInfo := &algorithms.PageInfo{
			HasNext:  resp.PageInfo.HasNextPage,
			After:    resp.PageInfo.EndCursor,
			PageSize: size,
		}
		return resp.Edges, pageInfo, nil
	}
	return algorithms.NewPager[*console.ListClusterSentinelRunJobs_ClusterSentinelRunJobs_Edges](common.DefaultPageSize, fetch)
}

func (r *SentinelReconciler) Poll(ctx context.Context) error {
	logger := log.FromContext(ctx)
	logger.V(4).Info("fetching sentinel run jobs")
	pager := r.ListSentinelRunJobs(ctx)

	for pager.HasNext() {
		runs, err := pager.NextPage()
		if err != nil {
			logger.Error(err, "failed to fetch sentinel run list")
			return err
		}
		for _, run := range runs {
			logger.V(1).Info("sending update for", "sentinel run job", run.Node.ID)
			r.sentinelCache.Add(run.Node.ID, run.Node)
			r.sentinelQueue.AddAfter(run.Node.ID, utils.Jitter(r.GetPollInterval()()))
		}
	}

	return nil
}

func (r *SentinelReconciler) Reconcile(ctx context.Context, id string) (reconcile.Result, error) {
	logger := log.FromContext(ctx)
	logger.V(4).Info("attempting to sync sentinel run job", "id", id)
	run, err := r.sentinelCache.Get(id)
	if err != nil {
		if clienterrors.IsNotFound(err) {
			logger.Info("sentinel run job run already deleted", "id", id)
			return reconcile.Result{}, nil
		}
		logger.Error(err, fmt.Sprintf("failed to fetch sentinel run job: %s, ignoring for now", id))
		return reconcile.Result{}, err
	}
	if run.Status != console.SentinelRunJobStatusPending {
		return reconcile.Result{}, nil
	}

	return reconcile.Result{}, r.reconcileSentinelRunJobCR(ctx, run)
}

func (r *SentinelReconciler) reconcileSentinelRunJobCR(ctx context.Context, run *console.SentinelRunJobFragment) error {
	logger := log.FromContext(ctx)

	name := GetRunResourceName(run)
	namespace := r.GetRunResourceNamespace(pkgcommon.GetRunJobSpec(name, run.JobSpec))

	if err := r.namespaceCache.EnsureNamespace(ctx, namespace, &console.ServiceDeploymentForAgent_SyncConfig{
		CreateNamespace: lo.ToPtr(true),
	}); err != nil {
		return err
	}
	cr := &v1alpha1.SentinelRunJob{}
	if err := r.k8sClient.Get(ctx, types.NamespacedName{Name: name, Namespace: namespace}, cr); err != nil {
		if !apierrs.IsNotFound(err) {
			return err
		}
		cr = &v1alpha1.SentinelRunJob{
			ObjectMeta: metav1.ObjectMeta{
				Name:      name,
				Namespace: namespace,
			},
			Spec: v1alpha1.SentinelRunJobSpec{
				RunID: run.ID,
			},
		}

		logger.Info("creating SentinelRunJob CR", "name", name, "namespace", namespace, "runID", run.ID)
		return r.k8sClient.Create(ctx, cr)
	}
	return nil
}

// GetRunResourceName returns a resource name used for a job and a secret connected to a given run.
func GetRunResourceName(run *console.SentinelRunJobFragment) string {
	return fmt.Sprintf("sentinel-%s", run.ID)
}

// GetRunResourceNamespace returns a resource namespace used for a job and a secret connected to a given run.
func (r *SentinelReconciler) GetRunResourceNamespace(jobSpec *batchv1.JobSpec) (namespace string) {
	if jobSpec != nil {
		namespace = jobSpec.Template.Namespace
	}

	if namespace == "" {
		namespace = r.namespace
	}

	return
}
