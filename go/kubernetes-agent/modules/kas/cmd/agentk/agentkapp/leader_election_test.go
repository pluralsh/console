package agentkapp

import (
	"context"
	"testing"
	"time"

	"github.com/pluralsh/kubernetes-agent/pkg/agentcfg"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/testing/mock_modagent"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"
	"k8s.io/apimachinery/pkg/util/wait"
)

func TestLeaderElection_NotLeader_NoModule_Shutdown(t *testing.T) {
	// GIVEN
	lr, _, mockElector, _ := setup(t)
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	var wg wait.Group
	defer wg.Wait()

	// setup mock expectations
	mockElector.EXPECT().
		Run(gomock.Any(), gomock.Any(), gomock.Any()).
		DoAndReturn(func(ctx context.Context, onStartedLeading, onStoppedLeading func()) {
			<-ctx.Done()
			onStoppedLeading()
		})

	// WHEN
	wg.StartWithContext(ctx, lr.Run)

	// THEN
	cancel()
}

func TestLeaderElection_NotLeader_OneModule_Shutdown(t *testing.T) {
	// GIVEN
	lr, lmw, mockElector, _ := setup(t)

	// contexts
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	moduleCtx, moduleCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer moduleCancel()

	cfg := make(chan *agentcfg.AgentConfiguration, 1)
	c := &agentcfg.AgentConfiguration{}

	var wg wait.Group
	defer wg.Wait()

	// setup mock expectations
	mockElector.EXPECT().Run(gomock.Any(), gomock.Any(), gomock.Any()).
		DoAndReturn(func(ctx context.Context, onStartedLeading, onStoppedLeading func()) {
			<-ctx.Done()
			onStoppedLeading()
		})

	// WHEN
	wg.StartWithContext(ctx, lr.Run)
	wg.Start(func() {
		lmw.Run(moduleCtx, cfg)
	})
	cfg <- c

	// THEN
	// we need to give the leader module wrapper some time to register the module etc.
	// and we don't currently have a way to properly wait for that, so we are just going to sleep a little bit ...
	time.Sleep(300 * time.Millisecond)

	// ASSERT: the fact that no mock call to Module.Run was missing, means that the module wasn't started.

	// shutdown the leader module wrapper
	close(cfg)

	// we need to give the lmw some time to unregister properly before we shut down the leader runner Run
	time.Sleep(200 * time.Millisecond)

	// shutdown the leader runner
	cancel()
}

func TestLeaderElection_Leader_NoModule_Shutdown(t *testing.T) {
	// GIVEN
	lr, _, mockElector, _ := setup(t)
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	var wg wait.Group
	defer wg.Wait()

	startedLeading := make(chan struct{})

	// setup mock expectations
	mockElector.EXPECT().
		Run(gomock.Any(), gomock.Any(), gomock.Any()).
		DoAndReturn(func(ctx context.Context, onStartedLeading, onStoppedLeading func()) {
			onStartedLeading()
			close(startedLeading)
			<-ctx.Done()
			onStoppedLeading()
		})

	// WHEN
	wg.StartWithContext(ctx, lr.Run)

	// THEN
	select {
	case <-ctx.Done():
		require.FailNow(t, ctx.Err().Error())
	case <-startedLeading:
	}
	cancel()
}

func TestLeaderElection_Leader_OneModule_Shutdown(t *testing.T) {
	// GIVEN
	lr, lmw, mockElector, mockModule := setup(t)

	// contexts
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	moduleCtx, moduleCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer moduleCancel()

	cfg := make(chan *agentcfg.AgentConfiguration, 1)
	c := &agentcfg.AgentConfiguration{}

	var wg wait.Group
	defer wg.Wait()

	complete := make(chan struct{})

	// setup mock expectations
	mockElector.EXPECT().
		Run(gomock.Any(), gomock.Any(), gomock.Any()).
		DoAndReturn(func(ctx context.Context, onStartedLeading, onStoppedLeading func()) {
			onStartedLeading()
			<-ctx.Done()
			onStoppedLeading()
		})
	mockModule.EXPECT().Run(gomock.Any(), gomock.Any()).
		DoAndReturn(func(ctx context.Context, _ <-chan *agentcfg.AgentConfiguration) error {
			// shut down the module
			close(cfg)
			close(complete)
			return nil
		})

	// WHEN
	wg.StartWithContext(ctx, lr.Run)
	wg.Start(func() {
		lmw.Run(moduleCtx, cfg)
	})
	cfg <- c

	// THEN
	select {
	case <-ctx.Done():
		require.FailNow(t, ctx.Err().Error())
	case <-complete:
		// we need to give the leader runner some time to unregister the module,
		// and we don't currently have a way to properly wait for that, so we are just going to sleep a little bit ...
		time.Sleep(200 * time.Millisecond)
	}
	cancel()
}

func TestLeaderElection_LeaderNotLeaderLeader_NoModule_Shutdown(t *testing.T) {
	// GIVEN
	lr, _, mockElector, _ := setup(t)
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	var wg wait.Group
	defer wg.Wait()

	secondStartedLeading := make(chan struct{})

	// setup mock expectations
	mockElector.EXPECT().
		Run(gomock.Any(), gomock.Any(), gomock.Any()).
		DoAndReturn(func(ctx context.Context, onStartedLeading, onStoppedLeading func()) {
			// first leading
			onStartedLeading()
			onStoppedLeading()

			// second leading
			onStartedLeading()
			close(secondStartedLeading)
			<-ctx.Done()
			onStoppedLeading()
		})

	// WHEN
	wg.StartWithContext(ctx, lr.Run)

	// THEN
	select {
	case <-ctx.Done():
		require.FailNow(t, ctx.Err().Error())
	case <-secondStartedLeading:
	}
	cancel()
}

func TestLeaderElection_LeaderNotLeaderLeader_OneModule_Shutdown(t *testing.T) {
	// GIVEN
	lr, lmw, mockElector, mockModule := setup(t)

	// contexts
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	moduleCtx, moduleCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer moduleCancel()

	cfg := make(chan *agentcfg.AgentConfiguration, 1)
	c := &agentcfg.AgentConfiguration{}

	var wg wait.Group
	defer wg.Wait()

	firstModuleStarted := make(chan struct{})
	complete := make(chan struct{})

	// setup mock expectations
	mockElector.EXPECT().
		Run(gomock.Any(), gomock.Any(), gomock.Any()).
		DoAndReturn(func(ctx context.Context, onStartedLeading, onStoppedLeading func()) {
			// first leading
			onStartedLeading()
			<-firstModuleStarted
			onStoppedLeading()

			// second leading
			onStartedLeading()
			<-ctx.Done()
			onStoppedLeading()
		})

	gomock.InOrder(
		mockModule.EXPECT().Run(gomock.Any(), gomock.Any()).
			DoAndReturn(func(ctx context.Context, cfgm <-chan *agentcfg.AgentConfiguration) error {
				c1 := <-cfgm
				assert.Same(t, c, c1)
				close(firstModuleStarted)

				<-ctx.Done()
				return nil
			}),
		mockModule.EXPECT().Run(gomock.Any(), gomock.Any()).
			DoAndReturn(func(ctx context.Context, cfgm <-chan *agentcfg.AgentConfiguration) error {
				c1 := <-cfgm
				assert.Same(t, c, c1)

				// shut down the module
				close(cfg)
				close(complete)
				return nil
			}),
	)

	// WHEN
	wg.StartWithContext(ctx, lr.Run)
	wg.Start(func() {
		lmw.Run(moduleCtx, cfg)
	})
	cfg <- c

	// THEN
	select {
	case <-ctx.Done():
		require.FailNow(t, ctx.Err().Error())
	case <-complete:
		// we need to give the leader runner some time to unregister the module,
		// and we don't currently have a way to properly wait for that, so we are just going to sleep a little bit ...
		time.Sleep(200 * time.Millisecond)
	}
	cancel()
}

func TestLeaderElection_NotLeader_OneModule_NewConfig_Shutdown(t *testing.T) {
	// GIVEN
	lr, lmw, mockElector, mockModule := setup(t)

	// contexts
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	moduleCtx, moduleCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer moduleCancel()

	cfg := make(chan *agentcfg.AgentConfiguration)
	firstRunnableCfg := &agentcfg.AgentConfiguration{}
	secondRunnableCfg := &agentcfg.AgentConfiguration{}

	var wg wait.Group
	defer wg.Wait()

	startLeading := make(chan struct{})
	complete := make(chan struct{})

	// setup mock expectations
	mockElector.EXPECT().
		Run(gomock.Any(), gomock.Any(), gomock.Any()).
		DoAndReturn(func(ctx context.Context, onStartedLeading, onStoppedLeading func()) {
			<-startLeading
			onStartedLeading()
			<-ctx.Done()
			onStoppedLeading()
		})
	gomock.InOrder(
		mockModule.EXPECT().Run(gomock.Any(), gomock.Any()).
			DoAndReturn(func(ctx context.Context, cfgm <-chan *agentcfg.AgentConfiguration) error {
				c := <-cfgm
				assert.Same(t, secondRunnableCfg, c)

				// shut down the module
				close(cfg)
				close(complete)
				return nil
			}),
	)

	// WHEN
	wg.StartWithContext(ctx, lr.Run)
	wg.Start(func() {
		lmw.Run(moduleCtx, cfg)
	})

	cfg <- firstRunnableCfg
	// give some time to process the first config
	time.Sleep(200 * time.Millisecond)
	cfg <- secondRunnableCfg
	// give some time to process the second config
	time.Sleep(200 * time.Millisecond)
	// start leading ...
	close(startLeading)

	// THEN
	select {
	case <-ctx.Done():
		require.FailNow(t, ctx.Err().Error())
	case <-complete:
		// we need to give the leader runner some time to unregister the module,
		// and we don't currently have a way to properly wait for that, so we are just going to sleep a little bit ...
		time.Sleep(200 * time.Millisecond)
	}
	cancel()
}

func setup(t *testing.T) (*leaderRunner, *leaderModuleWrapper, *MockLeaderElector, *mock_modagent.MockModule) {
	ctrl := gomock.NewController(t)

	mockModule := mock_modagent.NewMockModule(ctrl)
	mockElector := NewMockLeaderElector(ctrl)
	lr := newLeaderRunner(mockElector)
	lmw := newLeaderModuleWrapper(mockModule, lr)
	return lr, lmw, mockElector, mockModule
}
