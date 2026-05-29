package terragrunt

import (
	"context"
	"encoding/json"
	"fmt"
	"maps"
	"path"

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
	plan, err := in.plan()
	if err != nil {
		return nil, err
	}

	return &console.StackStateAttributes{
		Plan: &plan,
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

	result, err := in.Scanner.Scan(console.StackTypeTerragrunt, securityv1.WithTerraform(securityv1.TerraformScanOptions{
		WorkDir:           in.workDir,
		Dir:               in.dir,
		PlanFileName:      in.planFileName,
		VariablesFileName: in.variablesFileName,
	}))
	klog.V(log.LogLevelTrace).InfoS("terragrunt scanner scan", "result", result)

	return result, err
}

func (in *Terragrunt) plan() (string, error) {
	output, err := exec.NewExecutable(
		"terragrunt",
		exec.WithArgs([]string{"show", in.planFileName}),
		exec.WithDir(in.dir),
	).RunWithOutput(context.Background())
	if err != nil {
		return "", fmt.Errorf("failed executing terragrunt show: %s: %w", string(output), err)
	}

	klog.V(log.LogLevelTrace).InfoS("terragrunt plan file read successfully", "file", in.planFileName, "output", string(output))
	return string(output), nil
}

// planJSON parses the terraform plan file as JSON and returns a structured plan.
func (in *Terragrunt) planJSON() (*tfjson.Plan, error) {
	plan := new(tfjson.Plan)
	output, err := exec.NewExecutable(
		"terragrunt",
		exec.WithArgs([]string{"show", "-json", in.planFileName}),
		exec.WithDir(in.dir),
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
	plan, err := in.planJSON()
	if err != nil {
		return false, err
	}

	if len(plan.DeferredChanges) > 0 {
		klog.V(log.LogLevelDebug).InfoS("plan has deferred changes", "count", len(plan.DeferredChanges))
		return true, nil
	}

	hasResourceChanges := false
	for _, rc := range plan.ResourceChanges {
		if rc.Change != nil && !rc.Change.Actions.NoOp() {
			klog.V(log.LogLevelDebug).InfoS("plan has resource changes",
				"resource", rc.Address,
				"actions", rc.Change.Actions)
			hasResourceChanges = true
			break
		}
	}

	if hasResourceChanges {
		return true, nil
	}

	hasOutputChanges := false
	for name, oc := range plan.OutputChanges {
		if oc != nil && !oc.Actions.NoOp() {
			klog.V(log.LogLevelDebug).InfoS("plan has output changes",
				"output", name,
				"actions", oc.Actions)
			hasOutputChanges = true
			break
		}
	}

	if hasOutputChanges {
		return true, nil
	}

	if len(plan.ResourceDrift) > 0 {
		klog.V(log.LogLevelDebug).InfoS("plan detected resource drift",
			"count", len(plan.ResourceDrift))
		return true, nil
	}

	klog.V(log.LogLevelInfo).InfoS("terragrunt plan has no changes")
	return false, nil
}

func (in *Terragrunt) init() v1.Tool {
	if len(in.dir) == 0 {
		klog.Fatal("dir is required")
	}

	in.planFileName = "terraform.tfplan"
	helpers.EnsureFileOrDie(path.Join(in.dir, in.planFileName), nil)

	if in.variables != nil && len(*in.variables) > 0 {
		in.variablesFileName = "plural.auto.tfvars.json"
		helpers.EnsureFileOrDie(path.Join(in.dir, in.variablesFileName), in.variables)
	}

	return in
}

// New creates a Terragrunt structure that implements v1.Tool interface.
func New(config v1.Config) v1.Tool {
	return (&Terragrunt{
		DefaultTool: v1.DefaultTool{Scanner: config.Scanner},
		workDir:     config.WorkDir,
		dir:         config.ExecDir,
		variables:   config.Variables,
		parallelism: config.Run.Parallelism,
		refresh:     config.Run.Refresh,
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
