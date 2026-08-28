package acp

import (
	"context"
	"fmt"
	"path/filepath"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/opencode"
	toolv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/harness/exec"
)

// NewOpenCode creates the OpenCode provider adapter for the provider-neutral
// ACP tool. OpenCode-specific configuration and native export remain owned by
// the opencode package; ACP session lifecycle stays in this package.
func NewOpenCode(config toolv1.Config) toolv1.Tool {
	settings := opencode.ResolveACPSettings(config)
	repositoryDir := config.RepositoryDir
	if absolute, err := filepath.Abs(repositoryDir); err == nil {
		repositoryDir = absolute
	}
	mode := opencode.DefaultWriteAgent
	if config.Run.Mode == console.AgentRunModeAnalyze {
		mode = opencode.DefaultAnalysisAgent
	}

	return New(config,
		WithProviderName("opencode"),
		WithMode(mode),
		WithModel(settings.Provider+"/"+settings.Model),
		WithConfigure(func(consoleURL, consoleToken string) error {
			return opencode.Configure(config, consoleURL, consoleToken, opencode.Provider(settings.Provider), settings.Model, settings.OpenAICompatible)
		}),
		WithBabysitConfigure(func() error {
			defaultTool := toolv1.DefaultTool{Config: config}
			if err := defaultTool.ConfigureSystemPromptForBabysitRun(console.AgentRuntimeTypeOpencode); err != nil {
				return err
			}
			return defaultTool.ConfigureSkills(opencode.ACPSkillsPath(config))
		}),
		WithLauncher(func(ctx context.Context, options []exec.Option) (*exec.StdioProcess, error) {
			configPath, err := filepath.Abs(opencode.ACPConfigPath(config))
			if err != nil {
				return nil, fmt.Errorf("resolve opencode ACP config: %w", err)
			}
			options = append([]exec.Option(nil), options...)
			options = append(options,
				exec.WithArgs([]string{"acp"}),
				exec.WithEnv(opencode.ACPEnvironment(config, configPath)),
				exec.WithDir(repositoryDir),
				exec.WithTimeout(config.Run.Runtime.Config.OpenCode.Timeout),
			)
			// ACP owns cancellation ordering: send session/cancel first, then
			// close stdin and kill if the process does not exit. Do not attach
			// the prompt context directly to CommandContext, which would kill
			// OpenCode before the ACP cancellation request is delivered.
			return exec.StartWithStdio(context.Background(), "opencode", options...)
		}),
		WithExporter(func(ctx context.Context, outputPath, sessionID string) error {
			return opencode.ExportSession(ctx, config, sessionID, outputPath)
		}),
	)
}
