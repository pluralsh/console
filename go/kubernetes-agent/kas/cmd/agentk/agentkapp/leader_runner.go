package agentkapp

import (
	"context"
	"fmt"
	"time"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/util/wait"
	coordinationv1 "k8s.io/client-go/kubernetes/typed/coordination/v1"
	"k8s.io/client-go/tools/leaderelection"
	"k8s.io/client-go/tools/leaderelection/resourcelock"

	"github.com/pluralsh/kubernetes-agent/pkg/module/modagent"
)

type electorStatus byte

const (
	notRunning electorStatus = iota
	runningButNotLeader
	runningAndLeader
)

type LeaderElector interface {
	Run(ctx context.Context, onStartedLeading, onStoppedLeading func())
}

type leaderRunner struct {
	leaderElector    LeaderElector
	status           electorStatus
	onStartedLeading chan struct{}
	onStoppedLeading chan struct{}

	// nextModuleRegistrationId specifies the registration id that can be used for the next module to register
	nextModuleRegistrationId int32
	// modules is an invetory map of all currently registered leaderModule
	modules map[int32]*leaderModule
	// addModule is an internal channel to register a new leader module .
	// The RunWhenLeader method must be used to send a leaderModule to this channel.
	addModule chan *leaderModule
	// removeModule is an internal channel to unregister a previously registered leader module.
	// The CancelRunWhenLeaderFunc returned by the RunWhenLeader method must be used
	// to send a module registration id to this channel.
	removeModule chan int32
}

type leaderModule struct {
	start        ModuleStartFunc
	stop         ModuleStopFunc
	registeredId *ValueHolder[int32]
}

func newLeaderRunner(leaderElector LeaderElector) *leaderRunner {
	return &leaderRunner{
		leaderElector:    leaderElector,
		status:           notRunning,
		onStartedLeading: make(chan struct{}),
		onStoppedLeading: make(chan struct{}),

		modules:      make(map[int32]*leaderModule),
		addModule:    make(chan *leaderModule),
		removeModule: make(chan int32),
	}
}

func (r *leaderRunner) WrapModule(m modagent.Module) modagent.Module {
	return newLeaderModuleWrapper(m, r)
}

// RunWhenLeader registers a module start and stop function with the leader runner.
// The function that is returned must be used to unregister the leader module.
func (r *leaderRunner) RunWhenLeader(ctx context.Context, startFn ModuleStartFunc, stopFn ModuleStopFunc) (CancelRunWhenLeaderFunc, error) {
	m := &leaderModule{
		start:        startFn,
		stop:         stopFn,
		registeredId: NewValueHolder[int32](),
	}
	r.addModule <- m

	id, err := m.registeredId.get(ctx)
	return func() { r.removeModule <- id }, err
}

// Run starts the leader election process and starts and stops the modules depending on if it is the leader or not.
func (r *leaderRunner) Run(ctx context.Context) {
	if r.status != notRunning {
		panic(fmt.Errorf("the leader runner can only be started once; status is %d", r.status))
	}
	defer func() {
		r.status = notRunning
	}()

	r.status = runningButNotLeader

	var wg wait.Group
	defer wg.Wait()

	// The leader elector is only started once and it therefore, must ensure in its Run method
	// that the leader election is permanently running.
	electorCtx, electorCancel := context.WithCancel(context.Background())
	defer electorCancel() // we actually really want to control that during the ctx cancellation in the for-select below, but there is panics :)
	wg.Start(func() {
		r.leaderElector.Run(electorCtx,
			func() { r.onStartedLeading <- struct{}{} },
			func() { r.onStoppedLeading <- struct{}{} },
		)
	})

	// Implementation Details:
	// The for-select block below is the main loop for the leader runner, with the following responsibilities:
	// case #1:
	// - is called when the leader runner is requested to shut down. This may only happen during application shut down.
	// - the leader runner can only be shut down when there are no leader modules registered.
	// - this is the only place where the leader election is cancelled.
	// - because the leader elector (specifically because of the leaseLeaderElector) is always calling the OnStoppedLeading
	//   callback, that message must be received after cancelling the leader elector.
	//
	// case #2:
	// - registers a new leader module.
	// - if this leader runner holds the lease the module is started immediately.
	//
	// case #3:
	// - unregisters a previously registered leader module (via case #3).
	// - must be done before a shutdown of the leader runner is requested (see case #1).
	//
	// case #4:
	// - callback that is called once this leader acquires the leader election lease.
	// - if this leader runner wasn't already the leader it will start all currently registered leader modules.
	//
	// case #5:
	// - callback that is called once this leader loses the leader election lease.
	// - if this leader runner was indeed holding the lease it must stop all registered leader modules.
	//   and wait until they have been stopped properly.
	// - in case a leader module fails to stop the leader runner is unable to continue,
	//   because of a potentially unrecoverable state.
	done := ctx.Done()
	for {
		select {
		case <-done: // case #1
			// We must only receive a context cancellation on a shutdown of the application.
			// If we receive it, we expect that the app already properly stopped and unregistered all modules.

			if len(r.modules) > 0 {
				// This can only happen if leaderRunner is misused.
				// All modules must be stopped before the context can signal done.
				panic(fmt.Errorf("%d modules still want to run; status is %d", len(r.modules), r.status))
			}

			// If that's the case, we stop the elector
			electorCancel()

			// Because of a very unfortunate implementation the elector ALWAYS calls the OnStoppedLeading callback,
			// even if the elector doesn't hold the lease ... yes, really :tableflip:
			// So, let's consume that callback and wait for it to fully stop.
			<-r.onStoppedLeading

			return
		case module := <-r.addModule: // case #2
			moduleRegistrationId := r.nextModuleRegistrationId
			r.nextModuleRegistrationId++
			r.modules[moduleRegistrationId] = module
			err := module.registeredId.set(moduleRegistrationId)
			if err != nil {
				panic(fmt.Errorf("unable to set the registered module id: %w", err))
			}

			switch r.status {
			case runningAndLeader:
				module.start()
			case runningButNotLeader:
				// Nothing to do right now
				// The holder function will be started when elected as leader and
				// leader runner transitions to runningAndLeader
			case notRunning:
				fallthrough
			default:
				panic(fmt.Errorf("unexpected status: %d", r.status))
			}
		case moduleRegistrationId := <-r.removeModule: // case #3
			delete(r.modules, moduleRegistrationId)
		case <-r.onStartedLeading: // case #4
			// Leader elector calls onStartedLeading() callback asynchronously in a goroutine.
			// Because of that there is no ordering guarantee on when this is triggered. To mitigate the race
			// we have to check the current state and only act on the notification if it is expected.
			switch r.status {
			case runningButNotLeader:
				r.status = runningAndLeader
				for _, module := range r.modules {
					module.start()
				}
			case runningAndLeader:
				// This can happen if elector is stopped and started again really quickly and callback from the second
				// election executes before the callback from the first one. This is almost impossible.
				// Nothing to do here.
			case notRunning:
				fallthrough
			default:
				panic(fmt.Errorf("unexpected status: %d", r.status))
			}
		case <-r.onStoppedLeading: // case #5
			switch r.status {
			case runningButNotLeader:
				// onStoppedLeading() is called even if wasn't the leader.
				// Nothing to do here.
			case runningAndLeader:
				// Lost election. Must stop all functions ASAP.
				waiters := make([]ModuleStopWaitFunc, 0, len(r.modules))
				for _, module := range r.modules {
					waiter := module.stop()
					waiters = append(waiters, waiter)
				}

				for _, wait := range waiters {
					err := wait(ctx)
					if err != nil {
						panic(fmt.Errorf("failed to wait for module shutdown, because %w", err))
					}
				}
			case notRunning:
				fallthrough
			default:
				panic(fmt.Errorf("unexpected status: %d", r.status))
			}

			// We are not leading anymore.
			r.status = runningButNotLeader
		}
	}
}

type leaseLeaderElector struct {
	// Namespace is the namespace of the Lease lock object.
	namespace string
	// name returns name of the Lease lock object or an error if context signals done.
	name func(context.Context) (string, error)

	// Identity is the unique string identifying a lease holder across
	// all participants in an election.
	identity string

	coordinationClient coordinationv1.CoordinationV1Interface
	eventRecorder      resourcelock.EventRecorder
}

// Run runs the leader election
// Run triggers the onStartedLeading function when this instance acquired the lease.
// Run triggers the onStoppedLeading function when:
// 1. it had the lease acquired and lost it again
// 2. ctx is canceled, no matter if it held the lease or not
// The (2) bullet point above is due to the outrageous behavior of the client-go leaderelection implementation
// that ALWAYS calls the OnStoppedLeading callback NO MATTER if it held the lease or not when its ctx is canceled.
func (l *leaseLeaderElector) Run(ctx context.Context, onStartedLeading, onStoppedLeading func()) {
	name, err := l.name(ctx)
	if err != nil {
		// NOTE: we need to call onStoppedLeading explicitly here to guarantee a consistent interface for the caller
		// of this Run method - that is expecting that a onStoppedLeading callback is triggered whenever the
		// context is canceled and therefore the leader election is asked to be stopped.
		onStoppedLeading()
		return // ctx done
	}
	elector, err := leaderelection.NewLeaderElector(leaderelection.LeaderElectionConfig{
		Lock: &resourcelock.LeaseLock{
			LeaseMeta: metav1.ObjectMeta{
				Namespace: l.namespace,
				Name:      name,
			},
			Client: l.coordinationClient,
			LockConfig: resourcelock.ResourceLockConfig{
				Identity:      l.identity,
				EventRecorder: l.eventRecorder,
			},
		},
		LeaseDuration: 15 * time.Second,
		RenewDeadline: 10 * time.Second,
		RetryPeriod:   2 * time.Second,
		Callbacks: leaderelection.LeaderCallbacks{
			OnStartedLeading: func(ctx context.Context) { onStartedLeading() },
			OnStoppedLeading: onStoppedLeading,
		},
		ReleaseOnCancel: true,
		Name:            "module-runner",
	})
	if err != nil {
		// This can only happen if config is incorrect. It is hard-coded here, so should never happen.
		panic(err)
	}
	wait.UntilWithContext(ctx, elector.Run, time.Millisecond)
}
