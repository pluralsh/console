package v1

import (
	"fmt"
	"os"
	"path"

	console "github.com/pluralsh/console/go/client"
	"k8s.io/klog/v2"

	"github.com/pluralsh/deployment-operator/internal/helpers"
	"github.com/pluralsh/deployment-operator/pkg/log"
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

	content, err := systemPromptTemplate(templateFile, &SystemPromptTemplateInput{
		Mode:           in.Config.Run.Mode,
		BrowserEnabled: in.Config.Run.BrowserEnabled,
		DindEnabled:    in.Config.Run.DindEnabled,
	})
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
	inputFile := path.Join(systemPromptTemplateDir, systemPromptBabysitTemplateFile)

	src, err := os.ReadFile(inputFile)
	if err != nil {
		return fmt.Errorf("failed to read babysit system prompt template %q: %w", inputFile, err)
	}

	if err = helpers.File().Create(outputFile, string(src), 0644); err != nil {
		return fmt.Errorf("failed to write babysit system prompt %q: %w", outputFile, err)
	}

	return nil
}
