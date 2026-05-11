package controller

import (
	"context"
	"time"

	"sigs.k8s.io/controller-runtime/pkg/log"

	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"
)

// DebounceReconciler is a Reconciler that debounces reconcile requests.
type DebounceReconciler struct {
	client.Client
	// Minimum time to wait before processing requests.
	debounceDuration time.Duration
	// Last request time.
	lastRequest time.Time
	// Channel to trigger reconciliations.
	reconcileChan chan reconcile.Request
	// The actual reconciler that processes the requests.
	actualReconciler reconcile.Reconciler
}

// NewDebounceReconciler creates a new DebounceReconciler.
func NewDebounceReconciler(client client.Client, duration time.Duration, actual reconcile.Reconciler) *DebounceReconciler {
	return &DebounceReconciler{
		Client:           client,
		debounceDuration: duration,
		reconcileChan:    make(chan reconcile.Request, 1),
		actualReconciler: actual,
	}
}

// Reconcile implements the reconcile.Reconciler interface.
func (r *DebounceReconciler) Reconcile(_ context.Context, req reconcile.Request) (reconcile.Result, error) {
	select {
	case r.reconcileChan <- req:
	default:
		// Channel is full, drop the request to avoid spamming.
	}
	return reconcile.Result{}, nil
}

// Start begins the debouncing mechanism.
func (r *DebounceReconciler) Start(ctx context.Context) {
	logger := log.FromContext(ctx)
	go func() {
		ticker := time.NewTicker(r.debounceDuration)
		defer ticker.Stop()

		var latestRequest reconcile.Request

		for {
			select {
			case <-ctx.Done():
				return
			case req := <-r.reconcileChan:
				latestRequest = req
				r.lastRequest = time.Now()
			case <-ticker.C:
				// Check if enough time has passed since the last request.
				if !r.lastRequest.IsZero() && time.Since(r.lastRequest) >= r.debounceDuration {
					// Process the debounced request.
					if err := r.processRequest(ctx, latestRequest); err != nil {
						logger.Error(err, "Error processing request: %v\n")
					}
				}
			}
		}
	}()
}

// processRequest performs the actual reconciliation.
func (r *DebounceReconciler) processRequest(ctx context.Context, req reconcile.Request) error {
	_, err := r.actualReconciler.Reconcile(ctx, req)
	return err
}
