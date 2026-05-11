package v1

import (
	"context"
	"time"

	"k8s.io/client-go/util/workqueue"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	"github.com/pluralsh/deployment-operator/pkg/websocket"
)

type Reconciler interface {
	// Reconcile Kubernetes resources to reflect state from the Console.
	Reconcile(context.Context, string) (reconcile.Result, error)

	// Poll Console for any state changes and put them in the queue that will be consumed by Reconcile.
	Poll(context.Context) error

	// GetPublisher returns websocket resource key, i.e. "service" or "stack_run", and Publisher that will be registered with this reconciler.
	// TODO: Make it optional and/or accept multiple publishers.
	GetPublisher() (string, websocket.Publisher)

	// Queue returns a queue.
	Queue() workqueue.TypedRateLimitingInterface[string]

	// Shutdown shuts down the reconciler cache & queue
	Shutdown()

	// Restart initiates a reconciler restart. It ensures queue and cache are
	// safely cleaned up and reinitialized.
	Restart()

	// GetPollInterval returns custom poll interval. If 0 then controller manager use default from the options.
	GetPollInterval() func() time.Duration
}
