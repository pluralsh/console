package stacks

import (
	"context"
	"fmt"
	"time"

	"github.com/pluralsh/console/go/polly/cache"
	"github.com/pluralsh/deployment-operator/api/v1alpha1"
	batchv1 "k8s.io/api/batch/v1"
	apierrs "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/polly/algorithms"
	"k8s.io/apimachinery/pkg/runtime"
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
	Identifier = "Stack Controller"
)

type StackReconciler struct {
	consoleClient client.Client
	k8sClient     ctrlclient.Client
	scheme        *runtime.Scheme
	stackQueue    workqueue.TypedRateLimitingInterface[string]
	stackCache    *cache.Cache[console.StackRunMinimalFragment]
	namespace     string
	consoleURL    string
	deployToken   string
	pollInterval  time.Duration
}

func NewStackReconciler(consoleClient client.Client, k8sClient ctrlclient.Client, scheme *runtime.Scheme, refresh, pollInterval time.Duration, namespace, consoleURL, deployToken string) *StackReconciler {
	return &StackReconciler{
		consoleClient: consoleClient,
		k8sClient:     k8sClient,
		scheme:        scheme,
		stackQueue:    workqueue.NewTypedRateLimitingQueue(workqueue.DefaultTypedControllerRateLimiter[string]()),
		stackCache: cache.NewCache[console.StackRunMinimalFragment](refresh, func(id string) (*console.StackRunMinimalFragment, error) {
			return consoleClient.GetStackRun(id)
		}),
		consoleURL:   consoleURL,
		deployToken:  deployToken,
		pollInterval: pollInterval,
		namespace:    namespace,
	}
}

func (r *StackReconciler) Queue() workqueue.TypedRateLimitingInterface[string] {
	return r.stackQueue
}

func (r *StackReconciler) Restart() {
	// Cleanup
	r.stackQueue.ShutDown()
	r.stackCache.Wipe()

	// Initialize
	r.stackQueue = workqueue.NewTypedRateLimitingQueue(workqueue.DefaultTypedControllerRateLimiter[string]())
}

func (r *StackReconciler) Shutdown() {
	r.stackQueue.ShutDown()
	r.stackCache.Wipe()
}

func (r *StackReconciler) GetPollInterval() func() time.Duration {
	return func() time.Duration {
		if stackPollInterval := pkgcommon.GetConfigurationManager().GetStackPollInterval(); stackPollInterval != nil {
			return *stackPollInterval
		}
		return r.pollInterval
	}
}

func (r *StackReconciler) GetPublisher() (string, websocket.Publisher) {
	return "stack_run", &socketPublisher{
		stackRunQueue: r.stackQueue,
		stackRunCache: r.stackCache,
	}
}

func (r *StackReconciler) WipeCache() {
	r.stackCache.Wipe()
}

func (r *StackReconciler) ShutdownQueue() {
	r.stackQueue.ShutDown()
}

func (r *StackReconciler) ListStacks(ctx context.Context) *algorithms.Pager[*console.MinimalStackRunEdgeFragment] {
	logger := log.FromContext(ctx)
	logger.V(4).Info("create stack run pager")
	fetch := func(page *string, size int64) ([]*console.MinimalStackRunEdgeFragment, *algorithms.PageInfo, error) {
		resp, err := r.consoleClient.ListClusterStackRuns(page, &size)
		if err != nil {
			logger.Error(err, "failed to fetch stack run")
			return nil, nil, err
		}
		pageInfo := &algorithms.PageInfo{
			HasNext:  resp.PageInfo.HasNextPage,
			After:    resp.PageInfo.EndCursor,
			PageSize: size,
		}
		return resp.Edges, pageInfo, nil
	}
	return algorithms.NewPager[*console.MinimalStackRunEdgeFragment](common.DefaultPageSize, fetch)
}

func (r *StackReconciler) Poll(ctx context.Context) error {
	logger := log.FromContext(ctx)
	logger.V(4).Info("fetching stacks")
	pager := r.ListStacks(ctx)

	for pager.HasNext() {
		stacks, err := pager.NextPage()
		if err != nil {
			logger.Error(err, "failed to fetch stack run list")
			return err
		}
		for _, stack := range stacks {
			logger.V(1).Info("sending update for", "stack run", stack.Node.ID)
			r.stackCache.Add(stack.Node.ID, stack.Node)
			r.stackQueue.AddAfter(stack.Node.ID, utils.Jitter(r.GetPollInterval()()))
		}
	}

	return nil
}

func (r *StackReconciler) Reconcile(ctx context.Context, id string) (reconcile.Result, error) {
	logger := log.FromContext(ctx)
	logger.V(4).Info("attempting to sync stack run", "id", id)
	stackRun, err := r.stackCache.Get(id)
	if err != nil {
		if clienterrors.IsNotFound(err) {
			logger.Info("stack run already deleted", "id", id)
			return reconcile.Result{}, nil
		}
		logger.Error(err, fmt.Sprintf("failed to fetch stack run: %s, ignoring for now", id))
		return reconcile.Result{}, err
	}

	if stackRun.Status != console.StackStatusPending {
		return reconcile.Result{}, nil
	}

	return reconcile.Result{}, r.reconcileStackRunJobCR(ctx, stackRun)
}

func (r *StackReconciler) reconcileStackRunJobCR(ctx context.Context, run *console.StackRunMinimalFragment) error {
	logger := log.FromContext(ctx)
	name := GetRunResourceName(run)
	namespace := r.GetRunResourceNamespace(pkgcommon.GetRunJobSpec(name, run.JobSpec))
	cr := &v1alpha1.StackRunJob{}
	if err := r.k8sClient.Get(ctx, types.NamespacedName{Name: name, Namespace: namespace}, cr); err != nil {
		if !apierrs.IsNotFound(err) {
			return err
		}
		cr = &v1alpha1.StackRunJob{
			ObjectMeta: metav1.ObjectMeta{
				Name:      name,
				Namespace: namespace,
			},
			Spec: v1alpha1.StackRunJobSpec{
				RunID: run.ID,
			},
		}

		logger.Info("creating StackRunJob CR", "name", name, "namespace", namespace, "runID", run.ID)
		return r.k8sClient.Create(ctx, cr)
	}
	return nil
}

// GetRunResourceName returns a resource name used for a job and a secret connected to a given run.
func GetRunResourceName(run *console.StackRunMinimalFragment) string {
	return fmt.Sprintf("stack-%s", run.ID)
}

// GetRunResourceNamespace returns a resource namespace used for a job and a secret connected to a given run.
func (r *StackReconciler) GetRunResourceNamespace(jobSpec *batchv1.JobSpec) (namespace string) {
	if jobSpec != nil {
		namespace = jobSpec.Template.Namespace
	}

	if namespace == "" {
		namespace = r.namespace
	}

	return
}
