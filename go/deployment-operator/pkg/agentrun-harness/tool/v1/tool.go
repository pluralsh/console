package v1

import (
	"context"
	"fmt"
	"path"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/tool/artifacts"

	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/deployment-operator/internal/helpers"
	"github.com/pluralsh/console/go/deployment-operator/pkg/log"
)

const (
	// systemPromptTemplateDir is a path relative to the tool's current work dir
	// where the system prompt/context template files are stored.
	systemPromptTemplateDir = "system"

	// systemPromptAnalyzeTemplateFile represents the filename for the analyze
	// markdown template located in the system directory.
	systemPromptAnalyzeTemplateFile = "analyze.md.tmpl"

	// systemPromptWriteTemplateFile represents the filename for the write
	// markdown template located in the system directory.
	systemPromptWriteTemplateFile = "write.md.tmpl"

	systemPromptBabysitTemplateFile = "babysit.md.tmpl"
)

// ConfigureSystemPrompt prepares system prompt/context files for the provider and puts them in the required directory
// for the agent CLI to read during the run.
func (in DefaultTool) ConfigureSystemPrompt(runtime console.AgentRuntimeType) error {
	providerDir := ""
	switch runtime {
	case console.AgentRuntimeTypeClaude:
		providerDir = ".claude/prompts"
	case console.AgentRuntimeTypeGemini:
		providerDir = ".gemini/contexts"
	case console.AgentRuntimeTypeOpencode:
		providerDir = ".opencode/prompts"
	case console.AgentRuntimeTypeCodex:
		providerDir = ".codex"
	}

	outputFile := path.Join(in.Config.WorkDir, providerDir, SystemPromptFile)
	templateFile := systemPromptTemplateDir

	switch in.Config.Run.Mode {
	case console.AgentRunModeAnalyze:
		templateFile = path.Join(templateFile, systemPromptAnalyzeTemplateFile)
	case console.AgentRunModeWrite:
		templateFile = path.Join(templateFile, systemPromptWriteTemplateFile)
	}

	content, err := systemPromptTemplate(templateFile, in.systemPromptInput())
	if err != nil {
		return err
	}

	if err = helpers.File().Create(outputFile, content, 0644); err != nil {
		return fmt.Errorf("failed configuring %s system prompt/context file %q: %w", runtime, outputFile, err)
	}

	klog.V(log.LogLevelExtended).InfoS("system prompt/context file configured", "output", outputFile)
	return nil
}

func (in DefaultTool) ConfigureSystemPromptForBabysitRun(runtime console.AgentRuntimeType) error {
	providerDir := ""
	switch runtime {
	case console.AgentRuntimeTypeClaude:
		providerDir = ".claude/prompts"
	case console.AgentRuntimeTypeGemini:
		providerDir = ".gemini/contexts"
	case console.AgentRuntimeTypeOpencode:
		providerDir = ".opencode/prompts"
	case console.AgentRuntimeTypeCodex:
		providerDir = ".codex"
	}

	outputFile := path.Join(in.Config.WorkDir, providerDir, SystemPromptFile)
	templateFile := path.Join(systemPromptTemplateDir, systemPromptBabysitTemplateFile)

	content, err := systemPromptTemplate(templateFile, in.systemPromptInput())
	if err != nil {
		return fmt.Errorf("failed to render babysit system prompt template %q: %w", templateFile, err)
	}

	if err = helpers.File().Create(outputFile, content, 0644); err != nil {
		return fmt.Errorf("failed to write babysit system prompt %q: %w", outputFile, err)
	}

	return nil
}

func (in DefaultTool) systemPromptInput() *SystemPromptTemplateInput {
	return &SystemPromptTemplateInput{
		Mode:           in.Config.Run.Mode,
		BrowserEnabled: in.Config.Run.BrowserEnabled,
		DindEnabled:    in.Config.Run.DindEnabled,
		WorkDir:        in.Config.WorkDir,
		RepositoryDir:  in.Config.RepositoryDir,
		Prompt:         in.Config.Run.Prompt,
	}
}

func (in DefaultTool) BuildUploadArtifacts(ctx context.Context, opts artifacts.BuildArtifactsOptions) (*artifacts.UploadArtifacts, error) {
	return artifacts.NewUploadArtifactBuilder(artifacts.Config{
		WorkDir:       in.Config.WorkDir,
		RepositoryDir: in.Config.RepositoryDir,
		Run:           in.Config.Run,
	}).Build(ctx, opts)
}
