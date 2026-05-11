package controller

import (
	"cmp"
	"context"
	"fmt"
	"io"
	"path"
	"slices"
	"sync"

	gqlclient "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/polly/algorithms"
	clienterrors "github.com/pluralsh/deployment-operator/internal/errors"
	harnesserrors "github.com/pluralsh/deployment-operator/pkg/harness/errors"
	"k8s.io/klog/v2"

	"github.com/pluralsh/deployment-operator/pkg/harness/environment"
	"github.com/pluralsh/deployment-operator/pkg/harness/exec"
	"github.com/pluralsh/deployment-operator/pkg/harness/security"
	"github.com/pluralsh/deployment-operator/pkg/harness/sink"
	"github.com/pluralsh/deployment-operator/pkg/harness/stackrun"
	v1 "github.com/pluralsh/deployment-operator/pkg/harness/stackrun/v1"
	"github.com/pluralsh/deployment-operator/pkg/harness/tool"
	toolv1 "github.com/pluralsh/deployment-operator/pkg/harness/tool/v1"
	"github.com/pluralsh/deployment-operator/pkg/log"
)

// Start starts the manager and waits indefinitely.
// There are a couple of ways to have start return:
//   - an error has occurred in one of the internal operations
//   - all commands have finished their execution
//   - it was running for too long and timed out
//   - remote cancellation signal was received and stopped the execution
func (in *stackRunController) Start(ctx context.Context) (retErr error) {
	in.Lock()

	ready := false
	defer func() {
		// Only unlock if we haven't reached
		// the internal readiness condition.
		if !ready {
			in.Unlock()
		}

		// Make sure to always run postStart before exiting
		in.postStart(retErr)
	}()

	if retErr = in.prepare(); retErr != nil {
		return retErr
	}

	if retErr = in.preStart(); retErr != nil {
		return retErr
	}

	// Add executables to executor
	for _, e := range in.executables(ctx) {
		if retErr = in.executor.Add(e); retErr != nil {
			return retErr
		}
	}

	if retErr = in.executor.Start(ctx); retErr != nil {
		return fmt.Errorf("could not start executor: %w", retErr)
	}

	ready = true
	in.Unlock()
	select {
	// Stop the execution if provided context is done.
	case <-ctx.Done():
		retErr = context.Cause(ctx)
	// In case of any error finish the execution and return error.
	case err := <-in.errChan:
		retErr = err
	// If execution finished successfully return without error.
	case <-in.finishedChan:
		retErr = nil
	}

	// notify subroutines that we are done
	close(in.stopChan)

	// wait for all subroutines to finish
	in.wg.Wait()
	klog.V(log.LogLevelVerbose).InfoS("all subroutines finished")

	return retErr
}

func (in *stackRunController) executables(ctx context.Context) []exec.Executable {
	// Ensure that steps are sorted in the correct order
	slices.SortFunc(in.stackRun.Steps, func(s1, s2 *gqlclient.RunStepFragment) int {
		return cmp.Compare(s1.Index, s2.Index)
	})

	return algorithms.Map(in.stackRun.Steps, func(step *gqlclient.RunStepFragment) exec.Executable {
		return in.toExecutable(ctx, step)
	})
}

func (in *stackRunController) toExecutable(ctx context.Context, step *gqlclient.RunStepFragment) exec.Executable {
	// synchronize executable and underlying console writer with
	// the controller to ensure that it does not exit before
	// ensuring they have completed all work.
	in.wg.Add(1)

	toolWriters := make([]io.WriteCloser, 0)
	modifier := in.tool.Modifier(step.Stage)
	args := step.Args
	env := in.stackRun.Env()

	consoleWriter := sink.NewConsoleWriter(
		ctx,
		in.consoleClient,
		append(
			in.sinkOptions,
			sink.WithID(step.ID),
			sink.WithOnFinish(func() {
				// Notify controller that all remaining work
				// has been completed.
				in.wg.Done()
			}),
			sink.WithStopChan(in.stopChan),
		)...,
	)

	if modifier != nil {
		args = modifier.Args(args)
		env = modifier.Env(env)
		toolWriters = modifier.WriteCloser()
	}

	// base executable options
	options := in.execOptions
	options = append(
		options,
		exec.WithDir(in.execWorkDir()),
		exec.WithEnv(env),
		exec.WithArgs(args),
		exec.WithID(step.ID),
		exec.WithOutputSinks(append(toolWriters, consoleWriter)...),
		exec.WithHook(v1.LifecyclePreStart, in.preExecHook(ctx, step)),
		exec.WithHook(v1.LifecyclePostStart, in.postExecHook(step)),
		exec.WithOutputAnalyzer([]exec.OutputAnalyzerHeuristic{exec.NewKeywordDetector()}, exec.StderrCheckForProvider(in.stackRun.Type)),
	)

	return exec.NewExecutable(step.Cmd, options...)
}

func (in *stackRunController) completeStackRun(status gqlclient.StackStatus, stackRunErr error) error {
	var state *gqlclient.StackStateAttributes
	var output []*gqlclient.StackOutputAttributes
	var err error

	serviceErrorAttributes := make([]*gqlclient.ServiceErrorAttributes, 0)
	if stackRunErr != nil {
		serviceErrorAttributes = append(serviceErrorAttributes, &gqlclient.ServiceErrorAttributes{
			Source:  "harness",
			Message: stackRunErr.Error(),
		})
	}

	if in.tool == nil {
		return stackrun.CompleteStackRun(in.consoleClient, in.stackRunID, &gqlclient.StackRunAttributes{
			Errors: serviceErrorAttributes,
			Status: gqlclient.StackStatusFailed,
		})
	}

	state, err = in.tool.State()
	if err != nil {
		klog.ErrorS(err, "could not prepare state attributes")
	}
	klog.V(log.LogLevelTrace).InfoS("generated console state", "state", state)

	if !in.stackRun.DryRun {
		output, err = in.tool.Output()
		if err != nil {
			klog.ErrorS(err, "could not prepare output attributes")
		}
		klog.V(log.LogLevelTrace).InfoS("generated console output", "output", output)
	}

	return stackrun.CompleteStackRun(in.consoleClient, in.stackRunID, &gqlclient.StackRunAttributes{
		Errors: serviceErrorAttributes,
		Output: output,
		State:  state,
		Status: status,
	})
}

func (in *stackRunController) execWorkDir() string {
	if in.stackRun.ExecWorkDir != nil && len(*in.stackRun.ExecWorkDir) > 0 {
		return path.Join(in.dir, *in.stackRun.ExecWorkDir)
	}

	return in.dir
}

func (in *stackRunController) prepare() error {
	env := environment.New(
		environment.WithStackRun(in.stackRun),
		environment.WithWorkingDir(in.dir),
		environment.WithFilesDir(in.dir),
		environment.WithFetchClient(in.fetchClient),
	)

	if err := env.Setup(); err != nil {
		return err
	}

	variables, err := in.stackRun.Vars()
	if err != nil {
		return err
	}

	in.tool = tool.New(in.stackRun.Type, toolv1.Config{
		WorkDir:      in.dir,
		ExecDir:      in.execWorkDir(),
		Variables:    variables,
		Scanner:      security.NewScanner(in.stackRun.PolicyEngine),
		Run:          in.stackRun,
		ConsoleURL:   in.stackRun.ConsoleURL,
		ConsoleToken: in.stackRun.ConsoleToken,
	})

	return nil
}

func (in *stackRunController) init() (Controller, error) {
	if len(in.stackRunID) == 0 {
		return nil, fmt.Errorf("could not initialize controller: stack run id is empty")
	}

	if in.consoleClient == nil {
		return nil, fmt.Errorf("could not initialize controller: consoleClient is nil")
	}

	if stackRun, err := in.consoleClient.GetStackRunBase(in.stackRunID); err != nil {
		klog.Errorf("could not get stack run with id %s: %v", in.stackRunID, err)
		if clienterrors.IsUnauthenticated(err) {
			return nil, harnesserrors.WrapUnauthenticated("could not get stack run", err)
		}
		return nil, err
	} else {
		klog.V(log.LogLevelInfo).InfoS("found stack run", "id", stackRun.ID, "status", stackRun.Status, "type", stackRun.Type)
		in.stackRun = stackRun
	}

	return in, nil
}

func NewStackRunController(options ...Option) (Controller, error) {
	finishedChan := make(chan struct{})
	errChan := make(chan error, 1)
	ctrl := &stackRunController{
		errChan:      errChan,
		finishedChan: finishedChan,
		stopChan:     make(chan struct{}),
		wg:           sync.WaitGroup{},
		sinkOptions:  make([]sink.Option, 0),
	}

	ctrl.executor = exec.NewExecutor(
		errChan,
		finishedChan,
		exec.WithPostRunFunc(ctrl.postStepRun),
	)

	for _, option := range options {
		option(ctrl)
	}

	return ctrl.init()
}
