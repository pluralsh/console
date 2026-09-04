package tool

import (
	"errors"
	"fmt"

	"k8s.io/klog/v2"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/claude"
	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/codex"
	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/gemini"
	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/opencode"
	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/pi"
	v1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/log"
)

// New creates a specific tool implementation structure based on the provided
// console.AgentRuntimeType
func New(runtimeType console.AgentRuntimeType, config v1.Config) (v1.Tool, error) {
	if config.Run == nil {
		return nil, errors.New("agent run is not set")
	}

	klog.V(log.LogLevelInfo).InfoS("creating tool", "runtimeType", runtimeType, "proxy", config.Run.IsProxyEnabled())

	switch runtimeType {
	case console.AgentRuntimeTypeOpencode:
		agent := opencode.NewAgent(config)
		transport, err := opencode.NewTransport(agent)
		if err != nil {
			return nil, err
		}
		return v1.NewRuntime(config, agent, transport)
	case console.AgentRuntimeTypeClaude:
		return claude.New(config), nil
	case console.AgentRuntimeTypeGemini:
		return gemini.New(config), nil
	case console.AgentRuntimeTypeCodex:
		agent := codex.NewAgent(config)
		transport, err := codex.NewTransport(agent)
		if err != nil {
			return nil, err
		}
		return v1.NewRuntime(config, agent, transport)
	case console.AgentRuntimeTypePi:
		return pi.New(config), nil

	default:
		return nil, fmt.Errorf("unsupported agent run type: %s", runtimeType)
	}
}
