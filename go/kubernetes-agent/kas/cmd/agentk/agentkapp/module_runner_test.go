package agentkapp

import (
	"context"
	"testing"

	"github.com/google/go-cmp/cmp"

	"github.com/pluralsh/kubernetes-agent/pkg/agentcfg"
	"github.com/pluralsh/kubernetes-agent/pkg/module/agent_configuration/rpc"
	"github.com/pluralsh/kubernetes-agent/pkg/module/modagent"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/testing/mock_modagent"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/testing/mock_rpc"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"
	"go.uber.org/zap/zaptest"
	"golang.org/x/sync/errgroup"
	"google.golang.org/protobuf/testing/protocmp"
)

const (
	revision1 = "rev12341234_1"
	revision2 = "rev12341234_2"
)

var (
	projectId = "some/project"
)

func TestConfigurationIsApplied(t *testing.T) {
	cfg1 := &agentcfg.AgentConfiguration{}
	cfg2 := &agentcfg.AgentConfiguration{
		Gitops: &agentcfg.GitopsCF{
			ManifestProjects: []*agentcfg.ManifestProjectCF{
				{
					Id: &projectId,
				},
			},
		},
	}
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	ctrl := gomock.NewController(t)
	watcher := mock_rpc.NewMockConfigurationWatcherInterface(ctrl)
	m := mock_modagent.NewMockModule(ctrl)
	ctx1, cancel1 := context.WithCancel(context.Background())
	defer cancel1()
	ctx2, cancel2 := context.WithCancel(context.Background())
	defer cancel2()
	m.EXPECT().
		Run(gomock.Any(), gomock.Any()).
		Do(func(ctx context.Context, cfg <-chan *agentcfg.AgentConfiguration) error {
			c := <-cfg
			cancel1()
			assert.Empty(t, cmp.Diff(c, cfg1, protocmp.Transform()))
			c = <-cfg
			cancel2()
			assert.Empty(t, cmp.Diff(c, cfg2, protocmp.Transform()))
			<-ctx.Done()
			return nil
		})
	gomock.InOrder(
		watcher.EXPECT().
			Watch(gomock.Any(), gomock.Any()).
			Do(func(ctx context.Context, callback rpc.ConfigurationCallback) {
				callback(ctx, rpc.ConfigurationData{CommitId: revision1, Config: cfg1})
				<-ctx1.Done()
				callback(ctx, rpc.ConfigurationData{CommitId: revision2, Config: cfg2})
				<-ctx2.Done()
				cancel()
			}),
		m.EXPECT().
			DefaultAndValidateConfiguration(cfg1),
		m.EXPECT().
			DefaultAndValidateConfiguration(cfg2),
	)
	a := moduleRunner{
		log:                  zaptest.NewLogger(t),
		configurationWatcher: watcher,
	}
	run := a.RegisterModules([]modagent.Module{m})
	g, ctx := errgroup.WithContext(ctx)
	g.Go(func() error {
		return run(ctx)
	})
	g.Go(func() error {
		return a.RunConfigurationRefresh(ctx)
	})
	err := g.Wait()
	require.NoError(t, err)
}

func TestConfigurationIsSquashed(t *testing.T) {
	cfg1 := &agentcfg.AgentConfiguration{}
	cfg2 := &agentcfg.AgentConfiguration{
		Gitops: &agentcfg.GitopsCF{
			ManifestProjects: []*agentcfg.ManifestProjectCF{
				{
					Id: &projectId,
				},
				{
					DefaultNamespace: "abc",
				},
			},
		},
	}
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	ctrl := gomock.NewController(t)
	watcher := mock_rpc.NewMockConfigurationWatcherInterface(ctrl)
	m := mock_modagent.NewMockModule(ctrl)
	ctx1, cancel1 := context.WithCancel(context.Background())
	defer cancel1()
	m.EXPECT().
		Run(gomock.Any(), gomock.Any()).
		Do(func(ctx context.Context, cfg <-chan *agentcfg.AgentConfiguration) error {
			<-ctx1.Done()
			c := <-cfg
			cancel()
			assert.Empty(t, cmp.Diff(c, cfg2, protocmp.Transform()))
			<-ctx.Done()
			return nil
		})
	gomock.InOrder(
		watcher.EXPECT().
			Watch(gomock.Any(), gomock.Any()).
			Do(func(ctx context.Context, callback rpc.ConfigurationCallback) {
				callback(ctx, rpc.ConfigurationData{CommitId: revision1, Config: cfg1})
				callback(ctx, rpc.ConfigurationData{CommitId: revision2, Config: cfg2})
				cancel1()
				<-ctx.Done()
			}),
		m.EXPECT().
			DefaultAndValidateConfiguration(cfg1),
		m.EXPECT().
			DefaultAndValidateConfiguration(cfg2),
	)
	a := moduleRunner{
		log:                  zaptest.NewLogger(t),
		configurationWatcher: watcher,
	}
	run := a.RegisterModules([]modagent.Module{m})
	g, ctx := errgroup.WithContext(ctx)
	g.Go(func() error {
		return run(ctx)
	})
	g.Go(func() error {
		return a.RunConfigurationRefresh(ctx)
	})
	err := g.Wait()
	require.NoError(t, err)
}
