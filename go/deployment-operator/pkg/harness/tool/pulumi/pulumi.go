package pulumi

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	osexec "os/exec"
	"path"
	"strings"

	console "github.com/pluralsh/console/go/client"
	"github.com/samber/lo"
	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/deployment-operator/internal/helpers"
	"github.com/pluralsh/console/go/deployment-operator/pkg/harness/exec"
	stackrunv1 "github.com/pluralsh/console/go/deployment-operator/pkg/harness/stackrun/v1"
	v1 "github.com/pluralsh/console/go/deployment-operator/pkg/harness/tool/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/log"
)

type previewJSON struct {
	ChangeSummary struct {
		Create  int `json:"create"`
		Update  int `json:"update"`
		Delete  int `json:"delete"`
		Replace int `json:"replace"`
		Same    int `json:"same"`
	} `json:"changeSummary"`
}

type stackExport struct {
	Deployment struct {
		Resources []stackResource `json:"resources"`
	} `json:"deployment"`
}

type stackResource struct {
	URN    string         `json:"urn"`
	Type   string         `json:"type"`
	Inputs map[string]any `json:"inputs"`
}

// State implements [v1.Tool] interface.
func (in *Pulumi) State() (*console.StackStateAttributes, error) {
	export, err := in.stackExport()
	if err != nil {
		return nil, err
	}

	resources := make([]*console.StackStateResourceAttributes, 0, len(export.Deployment.Resources))
	for _, resource := range export.Deployment.Resources {
		if resource.URN == "" || strings.HasPrefix(resource.Type, "pulumi:providers:") {
			continue
		}

		configuration, _ := json.Marshal(resource.Inputs)
		resources = append(resources, &console.StackStateResourceAttributes{
			Identifier:    resource.URN,
			Resource:      resource.Type,
			Name:          resourceName(resource.URN),
			Configuration: lo.ToPtr(string(configuration)),
		})
	}

	return &console.StackStateAttributes{
		State: resources,
	}, nil
}

// Plan implements [v1.Tool] interface.
func (in *Pulumi) Plan() (*console.StackStateAttributes, error) {
	var plan string
	var err error

	if in.destroy {
		plan, err = in.destroyPreviewText()
	} else {
		plan, err = in.previewText()
	}
	if err != nil {
		return nil, err
	}

	return &console.StackStateAttributes{
		Plan: &plan,
	}, nil
}

// Output implements [v1.Tool] interface.
func (in *Pulumi) Output() ([]*console.StackOutputAttributes, error) {
	output, err := exec.NewExecutable(
		"pulumi",
		exec.WithArgs([]string{"stack", "output", "--json", "--show-secrets", "--stack", in.stackName}),
		exec.WithDir(in.dir),
	).RunWithOutput(context.Background())
	if err != nil {
		return nil, fmt.Errorf("failed executing pulumi stack output --json: %s: %w", string(output), err)
	}

	values := make(map[string]any)
	if len(output) == 0 {
		return []*console.StackOutputAttributes{}, nil
	}

	if err = json.Unmarshal(output, &values); err != nil {
		return nil, fmt.Errorf("failed unmarshaling pulumi stack output JSON: %w", err)
	}

	result := make([]*console.StackOutputAttributes, 0, len(values))
	for name, value := range values {
		result = append(result, &console.StackOutputAttributes{
			Name:  name,
			Value: outputValueString(value),
		})
	}

	return result, nil
}

// Modifier implements [v1.Tool] interface.
func (in *Pulumi) Modifier(stage console.StepStage) v1.Modifier {
	switch stage {
	case console.StepStagePlan:
		if in.destroy {
			return in.NewDestroyPreviewArgsModifier()
		}

		return in.NewPreviewArgsModifier(in.planFile)
	case console.StepStageApply:
		return in.NewUpArgsModifier(in.planFile)
	case console.StepStageDestroy:
		return in.NewDestroyArgsModifier()
	}

	return v1.NewDefaultModifier()
}

// ConfigureStateBackend implements [v1.Tool] interface.
func (in *Pulumi) ConfigureStateBackend(_, _ string, _ *console.StackRunBaseFragment_StateUrls) error {
	if err := os.MkdirAll("/plural/.pulumi", 0o755); err != nil {
		return fmt.Errorf("failed creating pulumi backend directory: %w", err)
	}

	if output, err := in.runPulumi([]string{"login", defaultBackendURL, "--non-interactive"}); err != nil {
		return fmt.Errorf("failed executing pulumi login: %s: %w", string(output), err)
	}

	initOutput, initErr := in.runPulumi([]string{"stack", "init", in.stackName, "--non-interactive"})
	if initErr != nil && !strings.Contains(string(initOutput), "already exists") {
		return fmt.Errorf("failed executing pulumi stack init: %s: %w", string(initOutput), initErr)
	}

	if output, err := in.runPulumi([]string{"stack", "select", in.stackName, "--non-interactive"}); err != nil {
		return fmt.Errorf("failed executing pulumi stack select: %s: %w", string(output), err)
	}

	return in.installDependencies()
}

// Scan implements [v1.Tool] interface.
func (in *Pulumi) Scan() ([]*console.StackPolicyViolationAttributes, error) {
	klog.V(log.LogLevelDebug).Info("pulumi scanner not configured, skipping")
	return []*console.StackPolicyViolationAttributes{}, nil
}

// HasChanges deterministically checks if the preview contains any changes.
func (in *Pulumi) HasChanges() (bool, error) {
	var preview *previewJSON
	var err error

	if in.destroy {
		preview, err = in.destroyPreviewJSON()
	} else {
		preview, err = in.previewJSON()
	}
	if err != nil {
		return false, err
	}

	changes := preview.ChangeSummary.Create +
		preview.ChangeSummary.Update +
		preview.ChangeSummary.Delete +
		preview.ChangeSummary.Replace

	if changes > 0 {
		return true, nil
	}

	klog.V(log.LogLevelInfo).InfoS("pulumi preview has no changes")
	return false, nil
}

func (in *Pulumi) previewJSON() (*previewJSON, error) {
	output, err := exec.NewExecutable(
		"pulumi",
		exec.WithArgs(in.previewArgs("--json")),
		exec.WithDir(in.dir),
	).RunWithOutput(context.Background())
	if err != nil {
		return nil, fmt.Errorf("failed executing pulumi preview --json: %s: %w", string(output), err)
	}

	preview := new(previewJSON)
	if err = json.Unmarshal(output, preview); err != nil {
		return nil, fmt.Errorf("failed unmarshaling pulumi preview JSON: %w", err)
	}

	return preview, nil
}

func (in *Pulumi) previewText() (string, error) {
	output, err := exec.NewExecutable(
		"pulumi",
		exec.WithArgs(in.previewArgs("--diff")),
		exec.WithDir(in.dir),
	).RunWithOutput(context.Background())
	if err != nil {
		return "", fmt.Errorf("failed executing pulumi preview --diff: %s: %w", string(output), err)
	}

	return string(output), nil
}

func (in *Pulumi) destroyPreviewText() (string, error) {
	output, err := exec.NewExecutable(
		"pulumi",
		exec.WithArgs(in.destroyPreviewArgs("--diff")),
		exec.WithDir(in.dir),
	).RunWithOutput(context.Background())
	if err != nil {
		return "", fmt.Errorf("failed executing pulumi destroy --preview-only --diff: %s: %w", string(output), err)
	}

	return string(output), nil
}

func (in *Pulumi) previewArgs(format string) []string {
	args := []string{"preview", format, "--stack", in.stackName, "--non-interactive"}
	args = appendParallel(args, in.parallel)
	args = appendRefresh(args, in.refresh)
	return args
}

func (in *Pulumi) destroyPreviewArgs(format string) []string {
	args := []string{"destroy", "--preview-only", format, "--stack", in.stackName, "--non-interactive"}
	args = appendParallel(args, in.parallel)
	args = appendRefresh(args, in.refresh)
	return args
}

func (in *Pulumi) destroyPreviewJSON() (*previewJSON, error) {
	output, err := exec.NewExecutable(
		"pulumi",
		exec.WithArgs(in.destroyPreviewArgs("--json")),
		exec.WithDir(in.dir),
	).RunWithOutput(context.Background())
	if err != nil {
		return nil, fmt.Errorf("failed executing pulumi destroy --preview-only --json: %s: %w", string(output), err)
	}

	preview := new(previewJSON)
	if err = json.Unmarshal(output, preview); err != nil {
		return nil, fmt.Errorf("failed unmarshaling pulumi destroy preview JSON: %w", err)
	}

	return preview, nil
}

func (in *Pulumi) stackExport() (*stackExport, error) {
	output, err := exec.NewExecutable(
		"pulumi",
		exec.WithArgs([]string{"stack", "export", "--stack", in.stackName}),
		exec.WithDir(in.dir),
	).RunWithOutput(context.Background())
	if err != nil {
		return nil, fmt.Errorf("failed executing pulumi stack export: %s: %w", string(output), err)
	}

	export := new(stackExport)
	if err = json.Unmarshal(output, export); err != nil {
		return nil, fmt.Errorf("failed unmarshaling pulumi stack export JSON: %w", err)
	}

	return export, nil
}

func (in *Pulumi) runPulumi(args []string) ([]byte, error) {
	return exec.NewExecutable(
		"pulumi",
		exec.WithArgs(args),
		exec.WithDir(in.dir),
	).RunWithOutput(context.Background())
}

func (in *Pulumi) installDependencies() error {
	if helpers.Exists(path.Join(in.dir, "package.json")) {
		output, err := exec.NewExecutable(
			"npm",
			exec.WithArgs([]string{"install", "--no-audit", "--no-fund"}),
			exec.WithDir(in.dir),
		).RunWithOutput(context.Background())
		if err != nil {
			return fmt.Errorf("failed executing npm install: %s: %w", string(output), err)
		}
	}

	if helpers.Exists(path.Join(in.dir, "go.mod")) {
		cmd := osexec.Command("go", "mod", "download")
		cmd.Dir = in.dir
		output, err := cmd.CombinedOutput()
		if err != nil {
			return fmt.Errorf("failed executing go mod download: %s: %w", string(output), err)
		}
	}

	return nil
}

func (in *Pulumi) init() v1.Tool {
	if len(in.dir) == 0 {
		klog.Fatal("dir is required")
	}

	if in.stackName == "" {
		in.stackName = defaultStackName
	}

	in.planFile = planFileName
	return in
}

// New creates a Pulumi structure that implements v1.Tool interface.
func New(config v1.Config) v1.Tool {
	stackName := defaultStackName
	var parallel *int64
	var refresh *bool

	if config.Run != nil {
		if config.Run.PulumiStack != nil && len(*config.Run.PulumiStack) > 0 {
			stackName = *config.Run.PulumiStack
		}

		parallel = config.Run.Parallel
		refresh = config.Run.Refresh
	}

	return (&Pulumi{
		DefaultTool: v1.DefaultTool{Scanner: config.Scanner},
		workDir:     config.WorkDir,
		dir:         config.ExecDir,
		stackName:   stackName,
		destroy:     isDestroyRun(config.Run),
		parallel:    parallel,
		refresh:     refresh,
	}).init()
}

func isDestroyRun(run *stackrunv1.StackRun) bool {
	if run == nil {
		return false
	}

	for _, step := range run.Steps {
		if step.Stage == console.StepStageDestroy {
			return true
		}
	}

	return false
}

func outputValueString(value any) string {
	if v, ok := value.(string); ok {
		return v
	}

	result, err := json.Marshal(value)
	if err != nil {
		klog.ErrorS(err, "unable to marshal pulumi output", "value", value)
		return ""
	}

	return string(result)
}

func resourceName(urn string) string {
	parts := strings.Split(urn, "::")
	if len(parts) == 0 {
		return urn
	}

	return parts[len(parts)-1]
}
