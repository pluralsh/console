package agentkapp

import (
	"context"

	"github.com/pluralsh/kubernetes-agent/pkg/agentcfg"
	"github.com/pluralsh/kubernetes-agent/pkg/module/modagent"

	"k8s.io/apimachinery/pkg/util/wait"
)

type ModuleStartFunc func()
type ModuleStopFunc func() ModuleStopWaitFunc
type ModuleStopWaitFunc func(context.Context) error
type CancelRunWhenLeaderFunc func()

type Runner interface {
	// RunWhenLeader registers the given start and stop functions for this module with the leader runner.
	// When the leader runner is elected as the leader it will execute the start function and
	// when the leader runner lost the leadership it will execute the stop function.
	// The start function must be able to be triggered multiple times (with intermediate stop executions)
	// without having to rely on a new agent configuration.
	// The function that is returned must be used to unregister the module
	// from the leader runner in case a shutdown is initiated or a previously registered start function
	// became invalid, for example because a new agent configuration turned out to be invalid.
	RunWhenLeader(ctx context.Context, startFn ModuleStartFunc, stopFunc ModuleStopFunc) (CancelRunWhenLeaderFunc, error)
}

type leaderModuleWrapper struct {
	module modagent.Module
	runner Runner

	// cfg2module is a bridge channels for agent configurations that is opened once the leader runner actually
	// starts the module.
	// This channel must be closed in order for the Module Run to properly shutdown.
	cfg2module chan *agentcfg.AgentConfiguration
	// maybeErrFromModuleRun is a channel where the return value from a Module Run call is sent to.
	// It must be consumed when the module is shut down explicitly and watched in case of an expected
	// shutdown of the module, e.g. in case of an actual error.
	maybeErrFromModuleRun chan error
	// runCancel is a cancellation function of the context that is passed to the Module Run call.
	// This cancellation function must be called in order for the Module Run to properly shutdown.
	runCancel context.CancelFunc
	// runWait is a function to wait for the Module Run call to finish.
	runWait func()

	// cancelRunWhenLeaderFunc is obtained when registering the module to the leader runner using Runner.RunWhenLeader
	// and must be used to unregister the module again.
	cancelRunWhenLeaderFunc CancelRunWhenLeaderFunc
}

func newLeaderModuleWrapper(module modagent.Module, runner Runner) *leaderModuleWrapper {
	return &leaderModuleWrapper{
		module:  module,
		runner:  runner,
		runWait: func() {},
	}
}

func (w *leaderModuleWrapper) DefaultAndValidateConfiguration(cfg *agentcfg.AgentConfiguration) error {
	return w.module.DefaultAndValidateConfiguration(cfg)
}

func (w *leaderModuleWrapper) Name() string {
	return w.module.Name()
}

func (w *leaderModuleWrapper) Run(ctx context.Context, cfg <-chan *agentcfg.AgentConfiguration) (retErr error) {
	var (
		nilableCfg chan<- *agentcfg.AgentConfiguration
		config     *agentcfg.AgentConfiguration
	)

	// This channel is used to initiate a start of this module with a given configuration.
	requestStartCh := make(chan *agentcfg.AgentConfiguration)
	// This channel is used to initiate a stop of a previously started module.
	requestStopCh := make(chan chan struct{})

	// safeStop should be used to safely stop the module and also nil the
	// configuration proxy channel so that nothing (config or nil) isn't attempted
	// to be sent to an already closed channel. The nilableCfg channel
	// will be reassigned an open module config channel when the module
	// is started again.
	safeStop := func() error {
		err := w.stop()
		nilableCfg = nil
		return err
	}

	// Implementation Details:
	// The for-select block below is the main loop of the leader module wrapper, with the following responsibilities:
	// case #1:
	// - receiving a request to start the module with a given initial configuration.
	// - the request message is sent by the start function registered with the leaderRunner.RunWhenLeader (see case #3).
	// - the initial configuration must be set to the internal config bridge (via nilableCfg and config variables)
	//   in order to not block the mian loop in case the module doesn't consume the config directly (the channel is unbuffered).
	//
	// case #2:
	// - receiving a request to stop the module.
	// - the module may or may not be running and in case it isn't it should be a no-op.
	// - the received channel must be closed in order to signal the listener that the module was stopped.
	//
	// case #3:
	// - receiving a new configuration from the caller
	// - if the configuration is not runnable and the module is running we need to stop and
	//   unregister it, so that the module isn't running with the old configuration.
	// - if the module is currently running and the config must be set to the internal config bridge (via nilableCfg and config variables)
	//   in order to send it to the module and to not block the main loop in case the module doesn't consume the config directly (the channel is unbuffered).
	// - if the module is not running, but it previously has been registered with the leader runner we have to unregister it,
	//   because the config we registered is now deprecated and mustn't be used.
	// - if the module is not running we register it with the leader runner to run it in the feature.
	// - if the cfg channel is closed we must abort the main loop.
	//
	// case #4:
	// - receiving a config from the internal bridge to send to a running module.
	// - the whole reason this case exists (and the other cases don't send it directly) is to not block the main loop
	//   in case the running module doesn't consume the config from the unbuffered config channel.
	// - once the config has been sent to the module the internal bridge must be disabled in order to not send the configuration multiple times.
	//
	// case #5:
	// - receiving the return value from modules that stopped without the main loop initiating it.
	// - the return value may be an error in which case the main loop is aborted.
	// - if there wasn't an error and we have a config to send we have to re-register the module with that in order for it to be started.

	// Once the main loop is stopped we need to ensure that the module is unregistered from the leader runner and properly stopped.
	defer func() {
		w.unregisterAsRunnableLeaderModule()

		err := w.stop()
		if retErr == nil {
			retErr = err
		}
	}()
	for {
		select {
		case initialCfg := <-requestStartCh: // case #1
			w.start() // nolint:contextcheck

			// Enabling case #4 in order to send initial config to the started module.
			config = initialCfg
			nilableCfg = w.cfg2module
		case stopped := <-requestStopCh: // case #2
			safeStop() // nolint:errcheck,gosec
			close(stopped)
		case c, ok := <-cfg: // case #3
			if !ok {
				// Closing the `cfg` channel means that we need to shut down.
				// The deferred function will take care of properly stopping and unregistering the module
				return nil
			}

			// If the config is valid and the module is already running, we enable case #4,
			// so that the config is sent to the module.
			if w.isRunning() {
				config = c
				nilableCfg = w.cfg2module
				continue
			}

			// Unregister the module we might have previously registered
			w.unregisterAsRunnableLeaderModule()

			// If the config is valid and the module is not running,
			// we register it to the leader so that it can be started
			err := w.registerAsRunnableLeaderModule(ctx, requestStartCh, requestStopCh, c)
			if err != nil {
				return err
			}
		case nilableCfg <- config: // case #4
			// Disabling case #4 so that this config isn't sent multiple times.
			config = nil
			nilableCfg = nil
		case err := <-w.maybeErrFromModuleRun: // case #5
			// The module returned without an explicit stop,
			// so we first ensure that the module is properly stopped and things are cleaned up for the next start
			// We can safely ignore the return value here, because it was already consumed by this very case.
			_ = safeStop()

			// If there actually was an error, we abort the run here and let the module runner handle it
			if err != nil {
				return err
			}

			// If there is a pending config, we should register the module with the leader runner again to be started.
			if config != nil {
				w.unregisterAsRunnableLeaderModule()
				err := w.registerAsRunnableLeaderModule(ctx, requestStartCh, requestStopCh, config)
				if err != nil {
					return err
				}
			}
		}
	}
}

func (w *leaderModuleWrapper) registerAsRunnableLeaderModule(ctx context.Context, requestStartCh chan<- *agentcfg.AgentConfiguration, requestStopCh chan<- chan struct{}, initialCfg *agentcfg.AgentConfiguration) error {
	unregisterFunc, err := w.runner.RunWhenLeader(
		ctx,
		func() { requestStartCh <- initialCfg },
		func() ModuleStopWaitFunc {
			// creating a channel that is used to signal that the module should stop
			stopped := make(chan struct{})
			// actually asking for the module to stop
			requestStopCh <- stopped
			// the wait function returned here just waits until the leaderModuleWrapper.Run main loop
			// confirms that the module has been stopped by sending a message to the stopped channel.
			return func(ctx context.Context) error {
				select {
				case <-ctx.Done():
					return ctx.Err()
				case <-stopped:
					return nil
				}
			}
		},
	)
	if err != nil {
		return err
	}

	w.cancelRunWhenLeaderFunc = unregisterFunc
	return nil
}

func (w *leaderModuleWrapper) unregisterAsRunnableLeaderModule() {
	if w.cancelRunWhenLeaderFunc != nil {
		w.cancelRunWhenLeaderFunc()
		w.cancelRunWhenLeaderFunc = nil
	}
}

func (w *leaderModuleWrapper) isRunning() bool {
	return w.runCancel != nil
}

// start starts the wrapped module using the Run method.
// A new decoupled context and agent configuration channel are created and passed to the Run method.
// The context cancellation function, config channel and a function to wait until the Run finished
// are stored in the leaderModuleWrapper to control the module Run lifetime using the main loop
// in the leaderModuleWrapper.Run method and the stop method.
// The return value from the module Run method is sent to an error channel.
func (w *leaderModuleWrapper) start() {
	var runCtx context.Context
	runCtx, w.runCancel = context.WithCancel(context.Background())

	w.cfg2module = make(chan *agentcfg.AgentConfiguration)
	w.maybeErrFromModuleRun = make(chan error, 1)

	var wg wait.Group
	w.runWait = wg.Wait
	wg.Start(func() {
		w.maybeErrFromModuleRun <- w.module.Run(runCtx, w.cfg2module)
	})
}

// stop stops the module if it was previously started and if not leads to a no-op.
// The stop of the module Run is requested by cancelling its context and closing
// its config channel.
// stop waits until the Run method finished, and it will consume the return value it produced
// and returns it.
func (w *leaderModuleWrapper) stop() error {
	if !w.isRunning() {
		return nil
	}

	// Let's make sure that we reset all the flags that indicates that the module is running
	// at the end of this function to appropriate "default" values.
	defer func() {
		w.maybeErrFromModuleRun = nil
		w.cfg2module = nil
		w.runWait = func() {}
		w.runCancel = nil
	}()

	// signal the module to actually shut down
	w.runCancel()
	close(w.cfg2module)
	// wait for the module until it has shut down
	w.runWait()

	// closing the return value channel from the module and consume the potential error.
	close(w.maybeErrFromModuleRun)
	err := <-w.maybeErrFromModuleRun
	return err
}
