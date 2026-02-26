package agentkapp

import (
	"context"
	"fmt"

	"github.com/ash2k/stager"

	"github.com/pluralsh/kubernetes-agent/pkg/agentcfg"
	agent_configuration_rpc "github.com/pluralsh/kubernetes-agent/pkg/module/agent_configuration/rpc"
	"github.com/pluralsh/kubernetes-agent/pkg/module/modagent"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/errz"
	logz2 "github.com/pluralsh/kubernetes-agent/pkg/tool/logz"

	"go.uber.org/zap"
)

type moduleHolder struct {
	module      modagent.Module
	cfg2pipe    chan *agentcfg.AgentConfiguration
	pipe2module chan *agentcfg.AgentConfiguration
}

func (h moduleHolder) runModule(ctx context.Context) error {
	return h.module.Run(ctx, h.pipe2module)
}

func (h moduleHolder) runPipe(ctx context.Context) error {
	defer close(h.pipe2module)
	var (
		nilablePipe2module chan<- *agentcfg.AgentConfiguration
		cfgToSend          *agentcfg.AgentConfiguration
	)
	// The loop consumes the incoming items from the configuration channel (cfg2pipe) and only sends the last
	// received item to the module (pipe2module). This allows to skip configuration changes that happened while the module was handling the
	// previous configuration change.
	done := ctx.Done()
	for {
		select {
		case <-done: // case #1
			return nil
		case cfgToSend = <-h.cfg2pipe: // case #2
			nilablePipe2module = h.pipe2module // enable case #3
		case nilablePipe2module <- cfgToSend: // case #3, disabled when nilablePipe2module == nil i.e. when there is nothing to send
			// config sent
			cfgToSend = nil          // help GC
			nilablePipe2module = nil // disable case #3
		}
	}
}

type moduleRunner struct {
	log                  *zap.Logger
	configurationWatcher agent_configuration_rpc.ConfigurationWatcherInterface
	holders              []moduleHolder
}

// RegisterModules registers modules with the runner. It returns a function to run modules.
func (r *moduleRunner) RegisterModules(modules []modagent.Module) func(context.Context) error {
	holders := make([]moduleHolder, 0, len(modules))
	for _, module := range modules {
		holder := moduleHolder{
			module:      module,
			cfg2pipe:    make(chan *agentcfg.AgentConfiguration),
			pipe2module: make(chan *agentcfg.AgentConfiguration),
		}
		holders = append(holders, holder)
		r.holders = append(r.holders, holder)
	}
	return func(ctx context.Context) error {
		return stager.RunStages(ctx,
			func(stage stager.Stage) {
				for _, holder := range holders {
					stage.Go(holder.runModule)
				}
			},
			func(stage stager.Stage) {
				for _, holder := range holders {
					stage.Go(holder.runPipe)
				}
			},
		)
	}
}

func (r *moduleRunner) RunConfigurationRefresh(ctx context.Context) error {
	r.configurationWatcher.Watch(ctx, func(ctx context.Context, data agent_configuration_rpc.ConfigurationData) {
		err := r.applyConfiguration(data.CommitId, data.Config)
		if err != nil {
			if !errz.ContextDone(err) {
				r.log.Error("Failed to apply configuration", logz2.CommitId(data.CommitId), logz2.Error(err))
			}
			return
		}
	})
	return nil
}

func (r *moduleRunner) applyConfiguration(commitId string, config *agentcfg.AgentConfiguration) error {
	r.log.Debug("Applying configuration", logz2.CommitId(commitId), logz2.ProtoJsonValue(logz2.AgentConfig, config))
	// Default and validate before setting for use.
	for _, holder := range r.holders {
		err := holder.module.DefaultAndValidateConfiguration(config)
		if err != nil {
			return fmt.Errorf("%s: %w", holder.module.Name(), err)
		}
	}
	// Set for use.
	for _, holder := range r.holders {
		holder.cfg2pipe <- config
	}
	return nil
}
