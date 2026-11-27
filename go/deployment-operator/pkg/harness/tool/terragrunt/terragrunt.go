package terragrunt

import (
	"context"
	"encoding/json"
	"fmt"
	"maps"
	"os"
	"path"
	"path/filepath"
	"strings"

	tfjson "github.com/hashicorp/terraform-json"
	"github.com/mitchellh/copystructure"
	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/polly/algorithms"
	"github.com/samber/lo"
	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/deployment-operator/internal/helpers"
	"github.com/pluralsh/console/go/deployment-operator/pkg/harness/exec"
	securityv1 "github.com/pluralsh/console/go/deployment-operator/pkg/harness/security/v1"
	v1 "github.com/pluralsh/console/go/deployment-operator/pkg/harness/tool/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/log"
)

// State implements [v1.Tool] interface.
func (in *Terragrunt) State() (*console.StackStateAttributes, error) {
	state, err := in.state()
	if err != nil || state.Values == nil || state.Values.RootModule == nil {
		return nil, err
	}

	resources := make([]*console.StackStateResourceAttributes, 0)
	_ = algorithms.BFS(state.Values.RootModule, func(module *tfjson.StateModule) ([]*tfjson.StateModule, error) {
		return module.ChildModules, nil
	}, func(module *tfjson.StateModule) error {
		klog.V(log.LogLevelTrace).InfoS("visiting module", "module", module)
		resources = append(resources, toStackStateResourceAttributesList(module.Resources)...)

		return nil
	})

	return &console.StackStateAttributes{
		State: resources,
	}, nil
}

// Plan implements [v1.Tool] interface.
func (in *Terragrunt) Plan() (*console.StackStateAttributes, error) {
	if in.runAll {
		return in.planAllState()
	}

	plan, err := in.plan()
	if err != nil {
		return nil, err
	}

	return &console.StackStateAttributes{
		Plan: &plan,
	}, nil
}

func (in *Terragrunt) planAllState() (*console.StackStateAttributes, error) {
	units, err := loadUnitPlans(in.jsonOutDir)
	if err != nil {
		return nil, err
	}

	var b strings.Builder
	for _, unit := range units {
		b.WriteString(formatUnitPlan(unit.rel, unit.plan))
		b.WriteByte('\n')
	}

	raw, err := combinedPlanJSON(units)
	if err != nil {
		return nil, err
	}

	text := b.String()
	return &console.StackStateAttributes{
		Plan:     &text,
		PlanJSON: &raw,
	}, nil
}

// Output implements [v1.Tool] interface.
func (in *Terragrunt) Output() ([]*console.StackOutputAttributes, error) {
	result := make([]*console.StackOutputAttributes, 0)

	state, err := in.state()
	if err != nil || state.Values == nil || state.Values.Outputs == nil {
		return nil, err
	}

	for k, v := range state.Values.Outputs {
		result = append(result, &console.StackOutputAttributes{
			Name:   k,
			Value:  outputValueString(v.Value),
			Secret: lo.ToPtr(v.Sensitive),
		})
	}

	return result, nil
}

// Modifier implements [v1.Tool] interface.
func (in *Terragrunt) Modifier(stage console.StepStage) v1.Modifier {
	switch stage {
	case console.StepStagePlan:
		return in.NewPlanArgsModifier(in.planFileName)
	case console.StepStageApply:
		return in.NewApplyArgsModifier(in.dir, in.planFileName)
	}

	return v1.NewDefaultModifier()
}

// ConfigureStateBackend implements [v1.Tool] interface.
func (in *Terragrunt) ConfigureStateBackend(actor, deployToken string, urls *console.StackRunBaseFragment_StateUrls) error {
	input := &OverrideTemplateInput{
		Address:       lo.FromPtr(urls.Terraform.Address),
		LockAddress:   lo.FromPtr(urls.Terraform.Lock),
		UnlockAddress: lo.FromPtr(urls.Terraform.Unlock),
		Actor:         actor,
		DeployToken:   deployToken,
	}
	fileName, content, err := overrideTemplate(input)
	if err != nil {
		return err
	}

	if err = helpers.File().Create(path.Join(in.dir, fileName), content, 0644); err != nil {
		return fmt.Errorf("failed configuring state backend file %q: %w", fileName, err)
	}

	return nil
}

func (in *Terragrunt) state() (*tfjson.State, error) {
	state := new(tfjson.State)
	output, err := exec.NewExecutable(
		"terragrunt",
		exec.WithArgs([]string{"show", "-json"}),
		exec.WithDir(in.dir),
		exec.WithEnv(in.env),
	).RunWithOutput(context.Background())
	if err != nil {
		return state, fmt.Errorf("failed executing terragrunt show -json: %s: %w", string(output), err)
	}

	err = state.UnmarshalJSON(output)
	if err != nil {
		return nil, err
	}

	klog.V(log.LogLevelTrace).InfoS("terragrunt state read successfully", "state", state)
	return state, nil
}

func (in *Terragrunt) Scan() ([]*console.StackPolicyViolationAttributes, error) {
	result := make([]*console.StackPolicyViolationAttributes, 0)
	if in.Scanner == nil {
		klog.V(log.LogLevelDebug).Info("terragrunt scanner not configured, skipping")
		return result, nil
	}

	if in.runAll {
		return in.scanAll()
	}

	result, err := in.Scanner.Scan(console.StackTypeTerragrunt, securityv1.WithTerraform(securityv1.TerraformScanOptions{
		WorkDir:           in.workDir,
		Dir:               in.dir,
		PlanFileName:      in.planFileName,
		VariablesFileName: in.variablesFileName,
	}))
	klog.V(log.LogLevelTrace).InfoS("terragrunt scanner scan", "result", result)

	return result, err
}

// scanAll scans each unit plan. A failure stops the run so apply cannot
// proceed when a required scan did not complete.
func (in *Terragrunt) scanAll() ([]*console.StackPolicyViolationAttributes, error) {
	plans, err := planFiles(in.jsonOutDir, planJSONBase)
	if err != nil {
		return nil, fmt.Errorf("could not list terragrunt plans to scan: %w", err)
	}

	result := make([]*console.StackPolicyViolationAttributes, 0)
	for _, plan := range plans {
		violations, err := in.Scanner.Scan(console.StackTypeTerragrunt, securityv1.WithTerraform(securityv1.TerraformScanOptions{
			WorkDir:           in.workDir,
			Dir:               filepath.Join(in.dir, filepath.FromSlash(plan.rel)),
			PlanFileName:      plan.path,
			VariablesFileName: in.variablesFileName,
		}))
		if err != nil {
			return nil, fmt.Errorf("security scan failed for %s: %w", plan.rel, err)
		}

		result = append(result, violations...)
	}

	klog.V(log.LogLevelTrace).InfoS("terragrunt scanner scan", "units", len(plans), "violations", len(result))
	return result, nil
}

// ApplyArgs implements [v1.ApplyArgumentPreparer]. It adds --filter flags for
// units whose saved JSON plans contain changes. The plan directory is empty
// until the plan step finishes, so this must run immediately before apply.
func (in *Terragrunt) ApplyArgs(args []string) ([]string, error) {
	if !in.runAll {
		return args, nil
	}

	filters, err := changedUnitFilters(in.jsonOutDir)
	if err != nil {
		return nil, fmt.Errorf("could not determine changed terragrunt units: %w", err)
	}
	if len(filters) == 0 {
		return nil, fmt.Errorf("could not determine changed terragrunt units: no units with changes")
	}

	return forwardCommand(insertBeforeSubcommand(args, filters...)), nil
}

func (in *Terragrunt) plan() (string, error) {
	if in.runAll {
		return in.planAll()
	}

	output, err := exec.NewExecutable(
		"terragrunt",
		exec.WithArgs([]string{"show", in.planFileName}),
		exec.WithDir(in.dir),
		exec.WithEnv(in.env),
	).RunWithOutput(context.Background())
	if err != nil {
		return "", fmt.Errorf("failed executing terragrunt show: %s: %w", string(output), err)
	}

	klog.V(log.LogLevelTrace).InfoS("terragrunt plan file read successfully", "file", in.planFileName, "output", string(output))
	return string(output), nil
}

func (in *Terragrunt) planAll() (string, error) {
	// Use the JSON written by run --all. terragrunt show re-evaluates each
	// unit and fails when a dependency has not been applied yet.
	units, err := loadUnitPlans(in.jsonOutDir)
	if err != nil {
		return "", err
	}

	var b strings.Builder
	for _, unit := range units {
		b.WriteString(formatUnitPlan(unit.rel, unit.plan))
		b.WriteByte('\n')
	}

	return b.String(), nil
}

// planJSON parses the terraform plan file as JSON and returns a structured plan.
func (in *Terragrunt) planJSON() (*tfjson.Plan, error) {
	plan := new(tfjson.Plan)
	output, err := exec.NewExecutable(
		"terragrunt",
		exec.WithArgs([]string{"show", "-json", in.planFileName}),
		exec.WithDir(in.dir),
		exec.WithEnv(in.env),
	).RunWithOutput(context.Background())
	if err != nil {
		return nil, fmt.Errorf("failed executing terragrunt show -json: %s: %w", string(output), err)
	}

	err = plan.UnmarshalJSON(output)
	if err != nil {
		return nil, fmt.Errorf("failed unmarshaling terragrunt plan JSON: %w", err)
	}

	klog.V(log.LogLevelTrace).InfoS("terragrunt plan JSON parsed successfully", "file", in.planFileName)
	return plan, nil
}

// HasChanges deterministically checks if the terraform plan contains any changes.
func (in *Terragrunt) HasChanges() (bool, error) {
	if in.runAll {
		return in.runAllHasChanges()
	}

	plan, err := in.planJSON()
	if err != nil {
		return false, err
	}

	if planHasChanges(plan) {
		return true, nil
	}

	klog.V(log.LogLevelInfo).InfoS("terragrunt plan has no changes")
	return false, nil
}

func (in *Terragrunt) runAllHasChanges() (bool, error) {
	units, err := loadUnitPlans(in.jsonOutDir)
	if err != nil {
		return false, err
	}

	for _, unit := range units {
		if planHasChanges(unit.plan) {
			klog.V(log.LogLevelDebug).InfoS("terragrunt unit has changes", "unit", unit.rel)
			return true, nil
		}
	}

	klog.V(log.LogLevelInfo).InfoS("terragrunt plan has no changes")
	return false, nil
}

func (in *Terragrunt) init() v1.Tool {
	if len(in.dir) == 0 {
		klog.Fatal("dir is required")
	}

	in.planFileName = "terraform.tfplan"
	if in.runAll {
		root, err := os.MkdirTemp("", "plural-terragrunt-")
		if err != nil {
			klog.Fatalf("could not create terragrunt plan directory: %v", err)
		}

		in.outDir = filepath.Join(root, "plans")
		in.jsonOutDir = filepath.Join(root, "json")
		if err := os.MkdirAll(in.outDir, 0o755); err != nil {
			klog.Fatalf("could not create terragrunt plan directory: %v", err)
		}
		if err := os.MkdirAll(in.jsonOutDir, 0o755); err != nil {
			klog.Fatalf("could not create terragrunt plan directory: %v", err)
		}
	}

	in.writeVariables()
	return in
}

func (in *Terragrunt) writeVariables() {
	if in.variables == nil || len(*in.variables) == 0 {
		return
	}

	in.variablesFileName = "plural.auto.tfvars.json"
	if !in.runAll {
		helpers.EnsureFileOrDie(path.Join(in.dir, in.variablesFileName), in.variables)
		return
	}

	err := filepath.WalkDir(in.dir, func(p string, d os.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() {
			if d.Name() == ".terragrunt-cache" {
				return filepath.SkipDir
			}
			return nil
		}
		if d.Name() != "terragrunt.hcl" {
			return nil
		}

		helpers.EnsureFileOrDie(filepath.Join(filepath.Dir(p), in.variablesFileName), in.variables)
		return nil
	})
	if err != nil {
		klog.Fatalf("could not write terragrunt variables: %v", err)
	}
}

// New creates a Terragrunt structure that implements v1.Tool interface.
func New(config v1.Config) v1.Tool {
	runAll := false
	if config.Run != nil {
		runAll = config.Run.RunAll
	}

	return (&Terragrunt{
		DefaultTool: v1.DefaultTool{Scanner: config.Scanner},
		workDir:     config.WorkDir,
		dir:         config.ExecDir,
		variables:   config.Variables,
		parallelism: config.Run.Parallelism,
		refresh:     config.Run.Refresh,
		env:         config.Env,
		runAll:      runAll,
	}).init()
}

func outputValueString(value any) string {
	if v, ok := value.(string); ok {
		return v
	}

	result, err := json.Marshal(value)
	if err != nil {
		klog.ErrorS(err, "unable to marshal tf state output", "value", value)
		return ""
	}

	return string(result)
}

func cloneMap(m map[string]any) map[string]any {
	c, err := copystructure.Copy(m)
	if err != nil {
		return maps.Clone(m)
	}

	return c.(map[string]any)
}

func excludeSensitiveValues(values map[string]any, sensitiveValues map[string]any) {
	for key, sensitiveValue := range sensitiveValues {
		switch typedSensitiveValue := sensitiveValue.(type) {
		case map[string]any:
			if outValue, ok := values[key]; ok {
				if typedOutValue, ok := outValue.(map[string]any); ok {
					excludeSensitiveValues(typedOutValue, typedSensitiveValue)
					continue
				}
			}
		case bool:
			if typedSensitiveValue {
				delete(values, key)
			}
		}
	}
}

func resourceConfiguration(resource *tfjson.StateResource) string {
	values := cloneMap(resource.AttributeValues)
	excludeSensitiveValues(values, resourceSensitiveValues(resource))
	attributeValuesString, _ := json.Marshal(values)
	return string(attributeValuesString)
}

func resourceSensitiveValues(resource *tfjson.StateResource) map[string]any {
	sensitiveValues := make(map[string]any)
	_ = json.Unmarshal(resource.SensitiveValues, &sensitiveValues)
	return sensitiveValues
}

func toStackStateResourceAttributesList(resources []*tfjson.StateResource) []*console.StackStateResourceAttributes {
	return algorithms.Filter(
		algorithms.Map(resources, toStackStateResourceAttributes),
		func(r *console.StackStateResourceAttributes) bool {
			return r != nil
		},
	)
}

func toStackStateResourceAttributes(resource *tfjson.StateResource) *console.StackStateResourceAttributes {
	if resource == nil {
		return nil
	}

	return &console.StackStateResourceAttributes{
		Identifier:    resource.Address,
		Resource:      resource.Type,
		Name:          resource.Name,
		Configuration: lo.ToPtr(resourceConfiguration(resource)),
		Links:         lo.ToSlicePtr(resource.DependsOn),
	}
}
