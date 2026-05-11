package tool

import (
	"fmt"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/deployment-operator/pkg/agentrun-harness/tool/claude"
	"github.com/pluralsh/deployment-operator/pkg/agentrun-harness/tool/codex"
	"github.com/pluralsh/deployment-operator/pkg/agentrun-harness/tool/gemini"
	"github.com/pluralsh/deployment-operator/pkg/agentrun-harness/tool/opencode"
	v1 "github.com/pluralsh/deployment-operator/pkg/agentrun-harness/tool/v1"
	"github.com/pluralsh/deployment-operator/pkg/log"
	"k8s.io/klog/v2"
)

// New creates a specific tool implementation structure based on the provided
// console.AgentRuntimeType
func New(runtimeType console.AgentRuntimeType, config v1.Config) (v1.Tool, error) {
	klog.V(log.LogLevelInfo).InfoS("creating tool", "runtimeType", runtimeType, "proxy", config.Run.IsProxyEnabled())

	switch runtimeType {
	case console.AgentRuntimeTypeOpencode:
		return opencode.New(config), nil
	case console.AgentRuntimeTypeClaude:
		return claude.New(config), nil
	case console.AgentRuntimeTypeGemini:
		return gemini.New(config), nil
	case console.AgentRuntimeTypeCodex:
		return codex.New(config), nil

	default:
		return nil, fmt.Errorf("unsupported agent run type: %s", runtimeType)
	}
}
