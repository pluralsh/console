package pulumi

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	osexec "os/exec"
	"path"
	"sort"
	"strconv"
	"strings"

	console "github.com/pluralsh/console/go/client"
	"github.com/samber/lo"
	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/deployment-operator/internal/helpers"
	"github.com/pluralsh/console/go/deployment-operator/pkg/harness/exec"
	v1 "github.com/pluralsh/console/go/deployment-operator/pkg/harness/tool/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/log"
)

type previewJSON struct {
	ChangeSummary map[string]int `json:"changeSummary"`
}

type stackExport struct {
	Deployment struct {
		Resources []stackResource `json:"resources"`
	} `json:"deployment"`
}

type stackResource struct {
	URN                     string         `json:"urn"`
	Type                    string         `json:"type"`
	Inputs                  map[string]any `json:"inputs"`
	Outputs                 map[string]any `json:"outputs"`
	AdditionalSecretOutputs []string       `json:"additionalSecretOutputs"`
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
	output, err := in.runPulumi([]string{"stack", "output", "--json", "--stack", in.stackName})
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

	secretOutputs, err := in.secretOutputNames()
	if err != nil {
		return nil, err
	}

	result := make([]*console.StackOutputAttributes, 0, len(values))
	for name, value := range values {
		secret := secretOutputs[name]
		outputValue := outputValueString(value)
		if secret {
			outputValue = "[secret]"
		}

		result = append(result, &console.StackOutputAttributes{
			Name:   name,
			Value:  outputValue,
			Secret: lo.ToPtr(secret),
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

// Prepare implements [v1.Tool] interface.
func (in *Pulumi) Prepare() error {
	if err := in.ensurePulumiHome(); err != nil {
		return err
	}

	if output, err := in.runPulumi([]string{"login", in.backendURL, "--non-interactive"}); err != nil {
		return fmt.Errorf("failed executing pulumi login: %s: %w", string(output), err)
	}

	if output, err := in.runPulumi([]string{"stack", "select", in.stackName, "--create", "--non-interactive"}); err != nil {
		return fmt.Errorf("failed executing pulumi stack select: %s: %w", string(output), err)
	}

	if err := in.configureVariables(); err != nil {
		return err
	}

	return in.installDependencies()
}

// Scan implements [v1.Tool] interface.
func (in *Pulumi) Scan() ([]*console.StackPolicyViolationAttributes, error) {
	if in.Scanner != nil {
		klog.V(log.LogLevelInfo).Info("pulumi policy enforcement is not supported, skipping scan")
		return []*console.StackPolicyViolationAttributes{}, nil
	}

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

	for operation, count := range preview.ChangeSummary {
		if operation != "same" && count > 0 {
			return true, nil
		}
	}

	klog.V(log.LogLevelInfo).InfoS("pulumi preview has no changes")
	return false, nil
}

func (in *Pulumi) previewJSON() (*previewJSON, error) {
	output, err := exec.NewExecutable(
		"pulumi",
		exec.WithArgs(in.previewArgs("--json")),
		exec.WithDir(in.dir),
		exec.WithEnv(in.env),
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
		exec.WithArgs(appendColor(in.previewArgs("--diff"))),
		exec.WithDir(in.dir),
		exec.WithEnv(in.env),
	).RunWithOutput(context.Background())
	if err != nil {
		return "", fmt.Errorf("failed executing pulumi preview --diff: %s: %w", string(output), err)
	}

	return string(output), nil
}

func (in *Pulumi) destroyPreviewText() (string, error) {
	output, err := exec.NewExecutable(
		"pulumi",
		exec.WithArgs(appendColor(in.destroyPreviewArgs("--diff"))),
		exec.WithDir(in.dir),
		exec.WithEnv(in.env),
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
		exec.WithEnv(in.env),
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
		exec.WithEnv(in.env),
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
		exec.WithEnv(in.env),
	).RunWithOutput(context.Background())
}

func (in *Pulumi) installDependencies() error {
	// Node.js and Go dependencies only.
	if helpers.Exists(path.Join(in.dir, "package.json")) {
		output, err := exec.NewExecutable(
			"npm",
			exec.WithArgs([]string{"install", "--no-audit", "--no-fund"}),
			exec.WithDir(in.dir),
			exec.WithEnv(in.env),
		).RunWithOutput(context.Background())
		if err != nil {
			return fmt.Errorf("failed executing npm install: %s: %w", string(output), err)
		}
	}

	if helpers.Exists(path.Join(in.dir, "go.mod")) {
		cmd := osexec.Command("go", "mod", "download")
		cmd.Dir = in.dir
		cmd.Env = append(os.Environ(), in.env...)
		output, err := cmd.CombinedOutput()
		if err != nil {
			return fmt.Errorf("failed executing go mod download: %s: %w", string(output), err)
		}
	}

	return nil
}

func (in *Pulumi) configureVariables() error {
	if in.variables == nil {
		return nil
	}

	var variables map[string]any
	if err := json.Unmarshal([]byte(*in.variables), &variables); err != nil {
		return fmt.Errorf("failed unmarshaling Pulumi variables: %w", err)
	}

	keys := make([]string, 0, len(variables))
	for key := range variables {
		keys = append(keys, key)
	}
	sort.Strings(keys)

	for _, key := range keys {
		value, valueType := pulumiConfigValue(variables[key])
		args := []string{"config", "set", key, value, "--stack", in.stackName, "--plaintext", "--type", valueType, "--non-interactive"}
		if output, err := in.runPulumi(args); err != nil {
			return fmt.Errorf("failed configuring Pulumi variable %q: %s: %w", key, string(output), err)
		}
	}

	return nil
}

func pulumiConfigValue(value any) (string, string) {
	switch typed := value.(type) {
	case bool:
		return strconv.FormatBool(typed), "bool"
	case float64:
		if typed == float64(int64(typed)) {
			return strconv.FormatInt(int64(typed), 10), "int"
		}
		return strconv.FormatFloat(typed, 'f', -1, 64), "float"
	case string:
		return typed, pulumiConfigTypeString
	default:
		encoded, err := json.Marshal(typed)
		if err != nil {
			return "", pulumiConfigTypeString
		}
		return string(encoded), pulumiConfigTypeString
	}
}

func (in *Pulumi) secretOutputNames() (map[string]bool, error) {
	export, err := in.stackExport()
	if err != nil {
		return nil, err
	}

	secrets := make(map[string]bool)
	for _, resource := range export.Deployment.Resources {
		if resource.Type != "pulumi:pulumi:Stack" {
			continue
		}
		for _, name := range resource.AdditionalSecretOutputs {
			secrets[name] = true
		}
		for name, value := range resource.Outputs {
			if isSecretValue(value) {
				secrets[name] = true
			}
		}
	}

	return secrets, nil
}

func isSecretValue(value any) bool {
	const secretSignature = "4dabf18193072939515e22adb298388d"

	switch typed := value.(type) {
	case map[string]any:
		if _, ok := typed[secretSignature]; ok {
			return true
		}
		for _, child := range typed {
			if isSecretValue(child) {
				return true
			}
		}
	case []any:
		for _, child := range typed {
			if isSecretValue(child) {
				return true
			}
		}
	}

	return false
}

func (in *Pulumi) ensurePulumiHome() error {
	home := pulumiHomeFromEnv(in.env)
	if home == "" {
		home = defaultPulumiHome
	}

	if err := os.MkdirAll(home, 0o755); err != nil {
		return fmt.Errorf("failed creating pulumi home directory %q: %w", home, err)
	}

	return nil
}

func pulumiEnv(env []string) []string {
	if pulumiHomeFromEnv(env) != "" {
		return env
	}

	return append(env, pulumiHomeEnvVar+"="+defaultPulumiHome)
}

func pulumiHomeFromEnv(env []string) string {
	prefix := pulumiHomeEnvVar + "="
	for _, entry := range env {
		if strings.HasPrefix(entry, prefix) {
			return strings.TrimPrefix(entry, prefix)
		}
	}

	return ""
}

func (in *Pulumi) init() v1.Tool {
	if len(in.dir) == 0 {
		klog.Fatal("dir is required")
	}

	if in.stackName == "" {
		in.stackName = defaultStackName
	}
	if in.backendURL == "" {
		in.backendURL = defaultBackendURL
	}

	in.env = pulumiEnv(in.env)
	in.planFile = planFileName
	return in
}

// New creates a Pulumi structure that implements v1.Tool interface.
func New(config v1.Config) v1.Tool {
	stackName := defaultStackName
	var parallel *int64
	var refresh *bool
	var backendURL string

	if config.Run != nil {
		if config.Run.PulumiStack != nil && len(*config.Run.PulumiStack) > 0 {
			stackName = *config.Run.PulumiStack
		}

		parallel = config.Run.Parallel
		refresh = config.Run.Refresh
		backendURL = lo.FromPtr(config.Run.PulumiBackendURL)
	}

	return (&Pulumi{
		DefaultTool: v1.DefaultTool{Scanner: config.Scanner},
		workDir:     config.WorkDir,
		dir:         config.ExecDir,
		stackName:   stackName,
		backendURL:  backendURL,
		destroy:     config.Run != nil && config.Run.Deleted,
		parallel:    parallel,
		refresh:     refresh,
		env:         config.Env,
		variables:   config.Variables,
	}).init()
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
