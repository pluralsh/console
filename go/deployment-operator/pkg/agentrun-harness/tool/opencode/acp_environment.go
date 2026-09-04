package opencode

import (
	"fmt"
	"path/filepath"

	toolv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/v1"
)

// These variables point OpenCode's ACP process at the run-local configuration
// and state directories instead of the container user's global directories.
const (
	opencodeConfigEnv = "OPENCODE_CONFIG"
	xdgConfigHomeEnv  = "XDG_CONFIG_HOME"
	xdgDataHomeEnv    = "XDG_DATA_HOME"
)

func (*Agent) configHome(config toolv1.Config) string {
	return filepath.Join(config.WorkDir, ".config")
}

func (*Agent) dataHome(config toolv1.Config) string {
	return filepath.Join(config.WorkDir, ".local", "share")
}

func (agent *Agent) env(config toolv1.Config, configPath string) []string {
	return []string{
		fmt.Sprintf("%s=%s", opencodeConfigEnv, configPath),
		fmt.Sprintf("%s=%s", xdgConfigHomeEnv, agent.configHome(config)),
		fmt.Sprintf("%s=%s", xdgDataHomeEnv, agent.dataHome(config)),
	}
}
