package opencode

import (
	"bytes"
	"context"
	"fmt"
	"os"
	stdexec "os/exec"
	"path/filepath"

	toolv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/v1"
)

// exportSession writes an OpenCode native session export to outputPath.
func (agent *Agent) exportSession(ctx context.Context, config toolv1.Config, sessionID, outputPath string) error {
	if sessionID == "" {
		return fmt.Errorf("opencode session id is not set")
	}
	configPath, err := filepath.Abs(agent.configPath(config))
	if err != nil {
		return err
	}

	file, err := os.Create(outputPath)
	if err != nil {
		return fmt.Errorf("create opencode session export %q: %w", outputPath, err)
	}
	defer file.Close()

	cmd := stdexec.CommandContext(ctx, "opencode", "export", sessionID)
	cmd.Env = append(os.Environ(), agent.env(config, configPath)...)
	cmd.Dir = config.RepositoryDir
	cmd.Stdout = file
	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("opencode export session %q: %w: %s", sessionID, err, stderr.String())
	}

	return nil
}
