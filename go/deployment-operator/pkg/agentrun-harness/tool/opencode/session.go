package opencode

import (
	"bytes"
	"context"
	"fmt"
	"os"
	stdexec "os/exec"
	"path/filepath"

	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/artifacts"
	toolv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/v1"
)

// exportSession writes an OpenCode session export JSON to outputPath.
// OpenCode 1.18.x registers this as a top-level CLI command (`opencode export`),
// not under `opencode session`.
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

// importSession rehydrates an OpenCode session export into the run-local XDG
// data home so ACP session/resume can find it. Copying the JSON into
// .opencode/sessions is not enough — OpenCode looks the session up in its
// SQLite store under XDG_DATA_HOME.
//
// OpenCode 1.18.x uses the top-level `opencode import` command and takes the
// project directory from the process working directory.
func (agent *Agent) importSession(ctx context.Context, config toolv1.Config, sessionJSON string) error {
	if sessionJSON == "" {
		return fmt.Errorf("opencode session export path is not set")
	}
	if _, err := os.Stat(sessionJSON); err != nil {
		return fmt.Errorf("stat opencode session export %q: %w", sessionJSON, err)
	}

	configPath, err := filepath.Abs(agent.configPath(config))
	if err != nil {
		return err
	}
	repositoryDir, err := filepath.Abs(config.RepositoryDir)
	if err != nil {
		return fmt.Errorf("resolve opencode repository directory: %w", err)
	}

	if err := os.MkdirAll(agent.dataHome(config), 0755); err != nil {
		return fmt.Errorf("create opencode data home: %w", err)
	}

	cmd := stdexec.CommandContext(ctx, "opencode", "import", sessionJSON)
	cmd.Env = append(os.Environ(), agent.env(config, configPath)...)
	cmd.Dir = repositoryDir
	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("opencode import session %q: %w: %s", sessionJSON, err, stderr.String())
	}
	return nil
}

func (agent *Agent) sessionExportPath(extractDir, archivePath string) string {
	if archivePath == "" {
		archivePath = "opencode"
	}
	return filepath.Join(extractDir, filepath.FromSlash(archivePath), artifacts.SessionJSONName)
}
