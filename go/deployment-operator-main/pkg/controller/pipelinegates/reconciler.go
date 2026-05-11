package pipelinegates

import (
	"context"
	"fmt"
	"time"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/polly/algorithms"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/client-go/util/workqueue"
	ctrlclient "sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	"github.com/pluralsh/deployment-operator/api/v1alpha1"
	"github.com/pluralsh/deployment-operator/internal/utils"
	"github.com/pluralsh/deployment-operator/pkg/cache"
	"github.com/pluralsh/deployment-operator/pkg/client"
	configuration "github.com/pluralsh/deployment-operator/pkg/common"
	"github.com/pluralsh/deployment-operator/pkg/controller/common"
	"github.com/pluralsh/deployment-operator/pkg/websocket"
)

const (
	Identifier = "Gate Controller"
)

type GateReconciler struct {
	k8sClient         ctrlclient.Client
	consoleClient     client.Client
	gateQueue         workqueue.TypedRateLimitingInterface[string]
	operatorNamespace string
	pollInterval      time.Duration
}

func NewGateReconciler(consoleClient client.Client, k8sClient ctrlclient.Client, pollInterval time.Duration) (*GateReconciler, error) {
	namespace, err := utils.GetOperatorNamespace()
	if err != nil {
		return nil, err
	}

	return &GateReconciler{
		k8sClient:         k8sClient,
		consoleClient:     consoleClient,
		gateQueue:         workqueue.NewTypedRateLimitingQueue(workqueue.DefaultTypedControllerRateLimiter[string]()),
		operatorNamespace: namespace,
		pollInterval:      pollInterval,
	}, nil
}

func (s *GateReconciler) Queue() workqueue.TypedRateLimitingInterface[string] {
	return s.gateQueue
}

func (s *GateReconciler) Restart() {
	// Cleanup
	s.gateQueue.ShutDown()
	cache.GateCache().Wipe()

	// Initialize
	s.gateQueue = workqueue.NewTypedRateLimitingQueue(workqueue.DefaultTypedControllerRateLimiter[string]())
}

func (s *GateReconciler) Shutdown() {
	s.gateQueue.ShutDown()
	cache.GateCache().Wipe()
}

func (s *GateReconciler) GetPollInterval() func() time.Duration {
	return func() time.Duration {
		if pipelineGateInterval := configuration.GetConfigurationManager().GetPipelineGateInterval(); pipelineGateInterval != nil {
			return *pipelineGateInterval
		}

		return s.pollInterval
	}
}

func (s *GateReconciler) ListGates(ctx context.Context) *algorithms.Pager[*console.PipelineGateIDsEdgeFragment] {
	logger := log.FromContext(ctx)
	logger.V(4).Info("create pipeline gate pager")
	fetch := func(page *string, size int64) ([]*console.PipelineGateIDsEdgeFragment, *algorithms.PageInfo, error) {
		resp, err := s.consoleClient.GetClusterGates(page, &size)
		if err != nil {
			logger.Error(err, "failed to fetch gates")
			return nil, nil, err
		}
		pageInfo := &algorithms.PageInfo{
			HasNext:  resp.PagedClusterGates.PageInfo.HasNextPage,
			After:    resp.PagedClusterGates.PageInfo.EndCursor,
			PageSize: size,
		}
		return resp.PagedClusterGates.Edges, pageInfo, nil
	}
	return algorithms.NewPager[*console.PipelineGateIDsEdgeFragment](common.DefaultPageSize, fetch)
}

func (s *GateReconciler) Poll(ctx context.Context) error {
	logger := log.FromContext(ctx)
	logger.V(4).Info("fetching gates for cluster")

	pager := s.ListGates(ctx)

	for pager.HasNext() {
		gates, err := pager.NextPage()
		if err != nil {
			logger.Error(err, "failed to fetch gates list")
			return err
		}

		for _, gate := range gates {
			logger.V(2).Info("sending update for", "gate", gate.Node.ID)
			s.gateQueue.Add(gate.Node.ID)
		}
	}

	return nil
}

func (s *GateReconciler) Reconcile(ctx context.Context, id string) (reconcile.Result, error) {
	logger := log.FromContext(ctx)

	logger.V(1).Info("attempting to sync gate", "id", id)
	var gate *console.PipelineGateFragment
	gate, err := cache.GateCache().Get(id)
	if err != nil {
		logger.Error(err, "failed to fetch gate: %s, ignoring for now")
		return reconcile.Result{}, err
	}

	logger.V(1).Info("attempting to sync gate", "Name", gate.Name, "ID", gate.ID)

	if gate.Type != console.GateTypeJob {
		logger.V(1).Info(fmt.Sprintf("gate is of type %s, we only reconcile gates of type %s skipping", gate.Type, console.GateTypeJob), "Name", gate.Name, "ID", gate.ID)
		return reconcile.Result{}, nil
	}

	gateCR, err := s.consoleClient.ParsePipelineGateCR(gate, s.operatorNamespace)
	if err != nil {
		logger.Error(err, "failed to parse gate CR", "Name", gate.Name, "ID", gate.ID)
		return reconcile.Result{}, err
	}

	// get pipelinegate
	currentGate := &v1alpha1.PipelineGate{}
	if err := s.k8sClient.Get(ctx, types.NamespacedName{Name: gateCR.Name, Namespace: gateCR.Namespace}, currentGate); err != nil {
		if !apierrors.IsNotFound(err) {
			logger.V(1).Info("Could not get gate.", "Namespace", gateCR.Namespace, "Name", gateCR.Name, "ID", gateCR.Spec.ID)
			return reconcile.Result{}, err
		}

		logger.V(1).Info("This gate doesn't yet have a corresponding CR on this cluster yet.", "Namespace", gateCR.Namespace, "Name", gateCR.Name, "ID", gateCR.Spec.ID)
		// If the PipelineGate doesn't exist, create it.
		if err = s.k8sClient.Create(context.Background(), gateCR); err != nil {
			logger.Error(err, "failed to create gate", "Namespace", gateCR.Namespace, "Name", gateCR.Name, "ID", gateCR.Spec.ID)
			return reconcile.Result{}, err
		}
	}

	return reconcile.Result{}, nil
}

func (s *GateReconciler) GetPublisher() (string, websocket.Publisher) {
	return "gate", &socketPublisher{
		gateQueue: s.gateQueue,
	}
}
