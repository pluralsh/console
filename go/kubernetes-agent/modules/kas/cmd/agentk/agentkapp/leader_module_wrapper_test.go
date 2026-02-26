package agentkapp

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/pluralsh/kubernetes-agent/pkg/agentcfg"
	"github.com/pluralsh/kubernetes-agent/pkg/module/modagent"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/testing/mock_modagent"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"
)

var (
	_ modagent.Module = (*leaderModuleWrapper)(nil)
)

func TestLMW_DefaultAndValidateConfiguration_IsDelegated(t *testing.T) {
	w, _, m := setupLMW(t)
	c := &agentcfg.AgentConfiguration{}
	m.EXPECT().
		DefaultAndValidateConfiguration(c).
		Return(errors.New("boom"))
	err := w.DefaultAndValidateConfiguration(c)
	assert.EqualError(t, err, "boom")
}

func TestLMW_Name_IsDelegated(t *testing.T) {
	w, _, m := setupLMW(t)
	m.EXPECT().
		Name().
		Return("name1")
	assert.Equal(t, "name1", w.Name())
}

func TestLMW_Run_StartWithConfig(t *testing.T) {
	// GIVEN
	w, r, m := setupLMW(t)
	c1 := &agentcfg.AgentConfiguration{}
	cfg := make(chan *agentcfg.AgentConfiguration, 1)
	complete := make(chan struct{})
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// setup mock expectations
	gomock.InOrder(
		r.EXPECT().
			RunWhenLeader(gomock.Any(), gomock.Any(), gomock.Any()).
			DoAndReturn(func(ctx context.Context, startFn ModuleStartFunc, stopFn ModuleStopFunc) (CancelRunWhenLeaderFunc, error) {
				// we cannot block the caller, because it wouldn't be able to receive the start function.
				go startFn()
				return func() {}, nil
			}),
		m.EXPECT().
			Run(gomock.Any(), gomock.Any()).
			DoAndReturn(func(ctx context.Context, cfgm <-chan *agentcfg.AgentConfiguration) error {
				c1m := <-cfgm
				assert.Same(t, c1, c1m)

				close(cfg)
				close(complete)
				return nil
			}),
	)

	// WHEN
	cfg <- c1
	err := w.Run(ctx, cfg)

	// THEN
	select {
	case <-ctx.Done():
		require.FailNow(t, ctx.Err().Error())
	case <-complete:
	}
	require.NoError(t, err)
	assert.False(t, w.isRunning())
}

func TestLMW_Run_ReceiveNewConfigs(t *testing.T) {
	// GIVEN
	w, r, m := setupLMW(t)
	c1 := &agentcfg.AgentConfiguration{}
	c2 := &agentcfg.AgentConfiguration{}
	c3 := &agentcfg.AgentConfiguration{}
	cfg := make(chan *agentcfg.AgentConfiguration, 1)
	complete := make(chan struct{})
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// setup mock expectations
	gomock.InOrder(
		r.EXPECT().
			RunWhenLeader(gomock.Any(), gomock.Any(), gomock.Any()).
			DoAndReturn(func(ctx context.Context, startFn ModuleStartFunc, stopFn ModuleStopFunc) (CancelRunWhenLeaderFunc, error) {
				// we cannot block the caller, because it wouldn't be able to receive the start function.
				go startFn()
				return func() {}, nil
			}),
		m.EXPECT().
			Run(gomock.Any(), gomock.Any()).
			DoAndReturn(func(ctx context.Context, cfgm <-chan *agentcfg.AgentConfiguration) error {
				c1m := <-cfgm
				assert.Same(t, c1, c1m)

				cfg <- c2
				c2m := <-cfgm
				assert.Same(t, c2, c2m)

				cfg <- c3
				c3m := <-cfgm
				assert.Same(t, c3, c3m)

				close(cfg)
				close(complete)
				return nil
			}),
	)

	// WHEN
	cfg <- c1
	err := w.Run(ctx, cfg)

	// THEN
	select {
	case <-ctx.Done():
		require.FailNow(t, ctx.Err().Error())
	case <-complete:
	}
	require.NoError(t, err)
	assert.False(t, w.isRunning())
}

func TestLMW_Run_EarlyReturnNoError(t *testing.T) {
	// GIVEN
	w, r, m := setupLMW(t)
	c1 := &agentcfg.AgentConfiguration{}
	cfg := make(chan *agentcfg.AgentConfiguration, 1)

	complete := make(chan struct{})
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// setup mock expectations
	gomock.InOrder(
		r.EXPECT().
			RunWhenLeader(gomock.Any(), gomock.Any(), gomock.Any()).
			DoAndReturn(func(ctx context.Context, startFn ModuleStartFunc, stopFn ModuleStopFunc) (CancelRunWhenLeaderFunc, error) {
				// we cannot block the caller, because it wouldn't be able to receive the start function.
				go startFn()
				return func() {}, nil
			}),
		m.EXPECT().
			Run(gomock.Any(), gomock.Any()).
			DoAndReturn(func(ctx context.Context, cfgm <-chan *agentcfg.AgentConfiguration) error {
				c1m := <-cfgm
				assert.Same(t, c1, c1m)
				close(cfg)
				close(complete)
				return nil
			}),
	)

	// WHEN
	cfg <- c1
	err := w.Run(ctx, cfg)

	// THEN
	select {
	case <-ctx.Done():
		require.FailNow(t, ctx.Err().Error())
	case <-complete:
	}
	require.NoError(t, err)
	assert.False(t, w.isRunning())
}

func TestLMW_Run_EarlyReturnNoErrorMoreConfig(t *testing.T) {
	// GIVEN
	w, r, m := setupLMW(t)
	c1 := &agentcfg.AgentConfiguration{}
	c2 := &agentcfg.AgentConfiguration{}
	cfg := make(chan *agentcfg.AgentConfiguration, 1)

	complete := make(chan struct{})
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// setup mock expectations
	r.EXPECT().
		RunWhenLeader(gomock.Any(), gomock.Any(), gomock.Any()).
		DoAndReturn(func(ctx context.Context, startFn ModuleStartFunc, stopFn ModuleStopFunc) (CancelRunWhenLeaderFunc, error) {
			// we cannot block the caller, because it wouldn't be able to receive the start function.
			go startFn()
			return func() {}, nil
		}).Times(2)
	gomock.InOrder(
		m.EXPECT().
			Run(gomock.Any(), gomock.Any()).
			DoAndReturn(func(ctx context.Context, cfgm <-chan *agentcfg.AgentConfiguration) error {
				c1m := <-cfgm
				assert.Same(t, c1, c1m)
				go func() {
					time.Sleep(time.Second)
					cfg <- c2
				}()
				return nil
			}),
		m.EXPECT().
			Run(gomock.Any(), gomock.Any()).
			DoAndReturn(func(ctx context.Context, cfgm <-chan *agentcfg.AgentConfiguration) error {
				c2m := <-cfgm
				assert.Same(t, c2, c2m)
				close(cfg)
				_, ok := <-cfgm
				assert.False(t, ok)

				close(complete)
				return nil
			}),
	)

	// WHEN
	cfg <- c1
	err := w.Run(context.Background(), cfg)

	// THEN
	select {
	case <-ctx.Done():
		require.FailNow(t, ctx.Err().Error())
	case <-complete:
	}
	require.NoError(t, err)
	assert.False(t, w.isRunning())
}

func TestLMW_Run_EarlyReturnError(t *testing.T) {
	// GIVEN
	w, r, m := setupLMW(t)
	c1 := &agentcfg.AgentConfiguration{}
	cfg := make(chan *agentcfg.AgentConfiguration, 1)

	complete := make(chan struct{})
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// setup mock expectations
	gomock.InOrder(
		r.EXPECT().
			RunWhenLeader(gomock.Any(), gomock.Any(), gomock.Any()).
			DoAndReturn(func(ctx context.Context, startFn ModuleStartFunc, stopFn ModuleStopFunc) (CancelRunWhenLeaderFunc, error) {
				// we cannot block the caller, because it wouldn't be able to receive the start function.
				go startFn()
				return func() {}, nil
			}),
		m.EXPECT().
			Run(gomock.Any(), gomock.Any()).
			DoAndReturn(func(ctx context.Context, cfgm <-chan *agentcfg.AgentConfiguration) error {
				close(complete)
				return errors.New("boom")
			}),
	)

	// WHEN
	cfg <- c1
	err := w.Run(ctx, cfg)

	// THEN
	select {
	case <-ctx.Done():
		require.FailNow(t, ctx.Err().Error())
	case <-complete:
	}
	assert.EqualError(t, err, "boom")
	assert.False(t, w.isRunning())
}

func setupLMW(t *testing.T) (*leaderModuleWrapper, *MockRunner, *mock_modagent.MockModule) {
	ctrl := gomock.NewController(t)
	m := mock_modagent.NewMockModule(ctrl)
	r := NewMockRunner(ctrl)
	w := newLeaderModuleWrapper(m, r)
	return w, r, m
}
