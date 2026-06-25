package v1

import (
	"context"
	"fmt"
	"path/filepath"
	"strings"
	"time"

	"github.com/samber/lo"
	"gopkg.in/yaml.v3"
	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/deployment-operator/internal/helpers"
	agentrunv1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/agentrun/v1"
	harnessexec "github.com/pluralsh/console/go/deployment-operator/pkg/harness/exec"
	"github.com/pluralsh/console/go/deployment-operator/pkg/log"
)

const (
	skillFileName          = "SKILL.md"
	skillsListCommandLimit = time.Minute
)

type skillFrontmatter struct {
	Name        string `yaml:"name"`
	Description string `yaml:"description"`
}

// ConfigureSkills sideloads agent-run skills into the provider-specific skills directory.
func (in DefaultTool) ConfigureSkills(skillRoot string) error {
	if in.Config.Run == nil || len(in.Config.Run.Skills) == 0 {
		return nil
	}
	if strings.TrimSpace(skillRoot) == "" {
		return fmt.Errorf("skill root is empty")
	}

	written := 0
	for _, skill := range in.Config.Run.Skills {
		name := strings.TrimSpace(skill.Name)
		contents := strings.TrimSpace(skill.Contents)
		if name == "" || contents == "" {
			klog.V(log.LogLevelDebug).InfoS("skipping malformed agent run skill", "agentRunID", in.Config.Run.ID, "name", skill.Name)
			continue
		}

		content, err := in.renderSkill(name, skill)
		if err != nil {
			return fmt.Errorf("failed rendering skill %q: %w", name, err)
		}

		outputPath, err := in.skillOutputPath(skillRoot, name)
		if err != nil {
			return err
		}
		if err := helpers.File().Create(outputPath, content, 0644); err != nil {
			return fmt.Errorf("failed writing skill %q to %q: %w", name, outputPath, err)
		}

		written++
		klog.V(log.LogLevelExtended).InfoS("agent run skill configured", "agentRunID", in.Config.Run.ID, "name", name, "output", outputPath)
	}

	klog.V(log.LogLevelInfo).InfoS("agent run skills configured", "agentRunID", in.Config.Run.ID, "count", written, "root", skillRoot)
	return nil
}

// LogConfiguredSkills emits provider-native CLI output that verifies loaded skills.
func (in DefaultTool) LogConfiguredSkills(provider, command string, args []string, options ...harnessexec.Option) {
	if in.Config.Run == nil || len(in.Config.Run.Skills) == 0 {
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), skillsListCommandLimit)
	defer cancel()

	executable := harnessexec.NewExecutable(
		command,
		append([]harnessexec.Option{harnessexec.WithArgs(args)}, options...)...,
	)

	output, err := executable.RunWithOutput(ctx)
	trimmedOutput := strings.TrimSpace(string(output))
	if err != nil {
		klog.V(log.LogLevelExtended).InfoS(
			"failed to list configured agent run skills",
			"agentRunID", in.Config.Run.ID,
			"provider", provider,
			"command", executable.Command(),
			"error", err.Error(),
			"output", trimmedOutput,
		)
		return
	}

	klog.V(log.LogLevelExtended).InfoS(
		"configured agent run skills listed",
		"agentRunID", in.Config.Run.ID,
		"provider", provider,
		"command", executable.Command(),
		"output", trimmedOutput,
	)
}

func (in DefaultTool) renderSkill(name string, skill agentrunv1.AgentSkill) (string, error) {
	description := lo.CoalesceOrEmpty(
		strings.TrimSpace(lo.FromPtr(skill.Description)),
		fmt.Sprintf("Plural workbench skill from agent run %s", in.Config.Run.ID),
	)

	frontmatter, err := yaml.Marshal(skillFrontmatter{
		Name:        name,
		Description: description,
	})
	if err != nil {
		return "", err
	}

	return fmt.Sprintf("---\n%s---\n\n%s\n",
		string(frontmatter),
		strings.TrimSpace(skill.Contents),
	), nil
}

func (in DefaultTool) skillOutputPath(root, name string) (string, error) {
	cleanRoot, err := filepath.Abs(root)
	if err != nil {
		return "", fmt.Errorf("failed resolving skill root %q: %w", root, err)
	}

	output := filepath.Join(cleanRoot, name, skillFileName)
	rel, err := filepath.Rel(cleanRoot, output)
	if err != nil {
		return "", fmt.Errorf("failed checking skill path %q: %w", output, err)
	}
	if rel == ".." || strings.HasPrefix(rel, ".."+string(filepath.Separator)) || filepath.IsAbs(rel) {
		return "", fmt.Errorf("skill path %q escapes root %q", output, cleanRoot)
	}

	return output, nil
}
