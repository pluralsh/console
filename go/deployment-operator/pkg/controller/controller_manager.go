package controller

import (
	"context"
	"errors"
	"fmt"
	"os"
	"sync"
	"time"

	"k8s.io/klog/v2"

	"github.com/pluralsh/deployment-operator/internal/helpers"
	"github.com/pluralsh/deployment-operator/internal/metrics"
	"github.com/pluralsh/deployment-operator/pkg/client"
	"github.com/pluralsh/deployment-operator/pkg/common"
	"github.com/pluralsh/deployment-operator/pkg/controller/service"
	v1 "github.com/pluralsh/deployment-operator/pkg/controller/v1"
	"github.com/pluralsh/deployment-operator/pkg/log"
	"github.com/pluralsh/deployment-operator/pkg/websocket"
)

type Manager struct {
	sync.Mutex

	Controllers []*Controller

	// MaxConcurrentReconciles is the maximum number of concurrent Reconciles which can be run.
	MaxConcurrentReconciles int

	// CacheSyncTimeout refers to the time limit set on waiting for cache to sync
	// Defaults to 2 minutes if not set.
	CacheSyncTimeout time.Duration

	// RecoverPanic indicates whether the panic caused by reconcile should be recovered.
	RecoverPanic *bool

	// PollInterval defines how often controllers should poll for new resources.
	PollInterval time.Duration

	// PollJitter defines how much polling jitter should there be when polling for new resources.
	PollJitter time.Duration

	// LivenessCheckInterval recheck the controller liveness.
	LivenessCheckInterval time.Duration

	Socket websocket.Socket

	// started is true if the Manager has been Started
	started bool

	client client.Client
}

func NewControllerManager(options ...ControllerManagerOption) (*Manager, error) {
	ctrl := &Manager{
		Controllers: make([]*Controller, 0),
		started:     false,
	}

	for _, option := range options {
		if err := option(ctrl); err != nil {
			return nil, err
		}
	}

	return ctrl, nil
}

func (cm *Manager) AddController(ctrl *Controller) {
	ctrl.SetupWithManager(cm)

	cm.Controllers = append(cm.Controllers, ctrl)
}

func (cm *Manager) GetReconcilerOrDie(name string) v1.Reconciler {
	for _, ctrl := range cm.Controllers {
		if ctrl.Name == name {
			return ctrl.Do
		}
	}

	panic(fmt.Sprintf("controller %s not found", name))
}

func (cm *Manager) AddReconcilerOrDie(name string, reconcilerGetter func() (v1.Reconciler, error)) {
	reconciler, err := reconcilerGetter()
	if err != nil {
		klog.ErrorS(err, "unable to create reconciler", "name", name)
		os.Exit(1)
	}

	cm.AddController(&Controller{
		Name: name,
		Do:   reconciler,
	})
}

func (cm *Manager) Start(ctx context.Context) error {
	cm.Lock()
	defer cm.Unlock()

	if cm.started {
		return errors.New("console controller manager was started more than once")
	}

	go cm.startSupervised(ctx)

	_ = helpers.DynamicBackgroundPollUntilContextCancel(ctx, func() time.Duration { return cm.PollInterval }, false, func(_ context.Context) (bool, error) {
		if common.GetConfigurationManager().IsWebsocketDisabled() {
			if err := cm.Socket.Close(); err != nil {
				klog.ErrorS(err, "unable to close websocket")
			}
			return false, nil
		}

		if err := cm.Socket.Join(); err != nil {
			klog.ErrorS(err, "unable to connect")
		}

		// never stop
		return false, nil
	})

	cm.started = true
	return nil
}

func (cm *Manager) startSupervised(ctx context.Context) {
	wg := &sync.WaitGroup{}
	wg.Add(len(cm.Controllers))

	for _, ctrl := range cm.Controllers {
		go func() {
			defer wg.Done()
			cm.startControllerSupervised(ctx, ctrl)
		}()
	}

	<-ctx.Done()
	klog.InfoS("Shutdown signal received, waiting for all controllers to finish", "name", "console-manager")
	wg.Wait()
	klog.InfoS("All controllers finished", "name", "console-manager")
}

func (cm *Manager) startControllerSupervised(ctx context.Context, ctrl *Controller) {
	internalCtx, cancel := context.WithCancel(ctx)
	wg := &sync.WaitGroup{}

	// Recheck the controller liveness every 30 seconds.
	livenessCheckInterval := 30 * time.Second
	if cm.LivenessCheckInterval > 0 {
		livenessCheckInterval = cm.LivenessCheckInterval
	}
	// Make last controller action deadline 5 times the time of regular poll.
	// It means that the controller hasn't polled/reconciled any resources.
	// It could indicate that the controller might have died and should be restarted.

	ticker := time.NewTicker(livenessCheckInterval)
	defer ticker.Stop()

	wg.Add(1)
	go func() {
		defer wg.Done()
		cm.startController(internalCtx, ctrl)
	}()

	for {
		select {
		case <-ctx.Done():
			klog.V(log.LogLevelDefault).InfoS(
				"Shutdown signal received, waiting for controller to finish",
				"name", ctrl.Name,
			)
			cancel()
			wg.Wait()
			klog.V(log.LogLevelDefault).InfoS("Controller shutdown finished", "name", ctrl.Name)
			return
		case <-internalCtx.Done():
			metrics.Record().ControllerRestart(ctrl.Name)
			klog.V(log.LogLevelVerbose).InfoS("Restart signal received, waiting for controller to finish", "name", ctrl.Name)
			wg.Wait()
			klog.V(log.LogLevelVerbose).InfoS("Controller finished", "name", ctrl.Name)
			// Reinitialize context
			internalCtx, cancel = context.WithCancel(ctx)
			// restart
			wg.Add(1)
			go func() {
				defer wg.Done()
				cm.restartController(internalCtx, ctrl)
			}()
		case <-ticker.C:
			lastControllerActionDeadline := 5 * ctrl.Do.GetPollInterval()()
			if lastControllerActionDeadline <= 0 {
				klog.V(log.LogLevelDebug).InfoS(
					"Controller poll interval is 0, skipping last poll time check",
					"name", ctrl.Name,
				)
				continue
			}

			lastPollTime := ctrl.LastPollTime()
			klog.V(log.LogLevelDebug).InfoS(
				"Controller last poll time check",
				"name", ctrl.Name,
				"lastPollTime", lastPollTime.Format(time.RFC3339),
			)
			if time.Now().After(lastPollTime.Add(lastControllerActionDeadline)) {
				klog.V(log.LogLevelDefault).InfoS(
					"Controller unresponsive, restarting",
					"ctrl", ctrl.Name,
					"lastPollTime", lastPollTime.Format(time.RFC3339),
					"lastControllerActionDeadline", lastControllerActionDeadline.String(),
				)
				cancel()
				break
			}

			// We only want to do an additional last reconcile time check
			// for services controller. There will always be at least one
			// service by default that should be reconciled. Other controllers
			// do not have any resources to reconcile by default.
			if ctrl.Name != service.Identifier {
				break
			}

			lastReconcileTime := ctrl.LastReconcileTime()
			klog.V(log.LogLevelDebug).InfoS(
				"Controller last reconcile time check",
				"name", ctrl.Name,
				"lastReconcileTime", lastReconcileTime.Format(time.RFC3339),
			)
			if time.Now().After(lastReconcileTime.Add(lastControllerActionDeadline)) {
				klog.V(log.LogLevelDefault).InfoS(
					"Controller unresponsive, restarting",
					"ctrl", ctrl.Name,
					"lastReconcileTime", lastPollTime.Format(time.RFC3339),
					"lastControllerActionDeadline", lastControllerActionDeadline.String(),
				)
				cancel()
			}
		}
	}
}

// startController starts the controller and blocks until it does not stop.
func (cm *Manager) startController(ctx context.Context, ctrl *Controller) {
	klog.V(log.LogLevelDefault).InfoS("Starting controller", "name", ctrl.Name)
	cm.Socket.AddPublisher(ctrl.Do.GetPublisher()) // If publisher exists, this is a no-op
	ctrl.Start(ctx)
}

func (cm *Manager) restartController(ctx context.Context, ctrl *Controller) {
	ctrl.Restart()
	cm.startController(ctx, ctrl)
}
