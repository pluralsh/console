package terraform

import (
	"context"
	"fmt"
	"path"

	tfjson "github.com/hashicorp/terraform-json"
	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/polly/algorithms"
	"github.com/samber/lo"
	"k8s.io/klog/v2"

	"github.com/pluralsh/deployment-operator/internal/helpers"
	"github.com/pluralsh/deployment-operator/pkg/harness/exec"
	securityv1 "github.com/pluralsh/deployment-operator/pkg/harness/security/v1"
	tfapi "github.com/pluralsh/deployment-operator/pkg/harness/tool/terraform/api"
	v1 "github.com/pluralsh/deployment-operator/pkg/harness/tool/v1"
	"github.com/pluralsh/deployment-operator/pkg/log"
)

// State implements [v1.Tool] interface.
func (in *Terraform) State() (*console.StackStateAttributes, error) {
	state, err := in.state()
	if err != nil || state.Values == nil || state.Values.RootModule == nil {
		return nil, err
	}

	resources := make([]*console.StackStateResourceAttributes, 0)
	_ = algorithms.BFS(state.Values.RootModule, func(module *tfjson.StateModule) ([]*tfjson.StateModule, error) {
		return module.ChildModules, nil
	}, func(module *tfjson.StateModule) error {
		klog.V(log.LogLevelTrace).InfoS("visiting module", "module", module)
		resources = append(
			resources,
			tfapi.ToStackStateResourceAttributesList(module.Resources)...,
		)

		return nil
	})

	return &console.StackStateAttributes{
		State: resources,
	}, nil
}

// Plan implements [v1.Tool] interface.
func (in *Terraform) Plan() (*console.StackStateAttributes, error) {
	plan, err := in.plan()
	if err != nil {
		return nil, err
	}

	return &console.StackStateAttributes{
		Plan: &plan,
	}, nil
}

// Output implements [v1.Tool] interface.
func (in *Terraform) Output() ([]*console.StackOutputAttributes, error) {
	result := make([]*console.StackOutputAttributes, 0)

	state, err := in.state()
	if err != nil || state.Values == nil || state.Values.Outputs == nil {
		return nil, err
	}

	for k, v := range state.Values.Outputs {
		result = append(result, &console.StackOutputAttributes{
			Name:   k,
			Value:  tfapi.OutputValueString(v.Value),
			Secret: lo.ToPtr(v.Sensitive),
		})
	}

	return result, nil
}

// Modifier implements [v1.Tool] interface.
func (in *Terraform) Modifier(stage console.StepStage) v1.Modifier {
	switch stage {
	case console.StepStagePlan:
		return in.NewPlanArgsModifier(in.planFileName)
	case console.StepStageApply:
		return in.NewApplyArgsModifier(in.dir, in.planFileName)
	}

	return v1.NewDefaultModifier()
}

// ConfigureStateBackend implements [v1.Tool] interface.
func (in *Terraform) ConfigureStateBackend(actor, deployToken string, urls *console.StackRunBaseFragment_StateUrls) error {
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

func (in *Terraform) state() (*tfjson.State, error) {
	state := new(tfjson.State)
	output, err := exec.NewExecutable(
		"terraform",
		exec.WithArgs([]string{"show", "-json"}),
		exec.WithDir(in.dir),
	).RunWithOutput(context.Background())
	if err != nil {
		return state, fmt.Errorf("failed executing terraform show -json: %s: %w", string(output), err)
	}

	err = state.UnmarshalJSON(output)
	if err != nil {
		return nil, err
	}

	klog.V(log.LogLevelTrace).InfoS("terraform state read successfully", "state", state)
	return state, nil
}

func (in *Terraform) Scan() ([]*console.StackPolicyViolationAttributes, error) {
	result := make([]*console.StackPolicyViolationAttributes, 0)
	if in.Scanner == nil {
		klog.V(log.LogLevelDebug).Info("terraform scanner not configured, skipping")
		return result, nil
	}

	result, err := in.Scanner.Scan(console.StackTypeTerraform, securityv1.WithTerraform(securityv1.TerraformScanOptions{
		WorkDir:           in.workDir,
		Dir:               in.dir,
		PlanFileName:      in.planFileName,
		VariablesFileName: in.variablesFileName,
	}))
	klog.V(log.LogLevelTrace).InfoS("terraform scanner scan", "result", result)

	return result, err
}

func (in *Terraform) plan() (string, error) {
	output, err := exec.NewExecutable(
		"terraform",
		exec.WithArgs([]string{"show", in.planFileName}),
		exec.WithDir(in.dir),
	).RunWithOutput(context.Background())
	if err != nil {
		return "", fmt.Errorf("failed executing terraform show: %s: %w", string(output), err)
	}

	klog.V(log.LogLevelTrace).InfoS("terraform plan file read successfully", "file", in.planFileName, "output", string(output))
	return string(output), nil
}

// planJSON parses the terraform plan file as JSON and returns a structured plan.
// This provides deterministic access to plan details including resource changes.
func (in *Terraform) planJSON() (*tfjson.Plan, error) {
	plan := new(tfjson.Plan)
	output, err := exec.NewExecutable(
		"terraform",
		exec.WithArgs([]string{"show", "-json", in.planFileName}),
		exec.WithDir(in.dir),
	).RunWithOutput(context.Background())
	if err != nil {
		return nil, fmt.Errorf("failed executing terraform show -json: %s: %w", string(output), err)
	}

	err = plan.UnmarshalJSON(output)
	if err != nil {
		return nil, fmt.Errorf("failed unmarshaling terraform plan JSON: %w", err)
	}

	klog.V(log.LogLevelTrace).InfoS("terraform plan JSON parsed successfully", "file", in.planFileName)
	return plan, nil
}

// HasChanges deterministically checks if the terraform plan contains any changes.
// It analyzes the plan JSON to detect:
// - Resource changes (create, update, delete, replace)
// - Output changes
// - Resource drift
// - Deferred changes (Terraform 1.8+)
//
// Returns true if any changes are detected, false if the plan is a no-op.
func (in *Terraform) HasChanges() (bool, error) {
	plan, err := in.planJSON()
	if err != nil {
		return false, err
	}

	// If there are deferred changes, we should consider this as having changes
	if len(plan.DeferredChanges) > 0 {
		klog.V(log.LogLevelDebug).InfoS("plan has deferred changes", "count", len(plan.DeferredChanges))
		return true, nil
	}

	// Check resource changes
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

	// Check output changes
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

	// Check resource drift
	// Note: Resource drift represents changes detected in actual infrastructure vs. state.
	// Even if there are no planned changes, drift indicates infrastructure differences.
	// TODO: determine if we want to treat drift as changes requiring apply.
	if len(plan.ResourceDrift) > 0 {
		klog.V(log.LogLevelDebug).InfoS("plan detected resource drift",
			"count", len(plan.ResourceDrift))
		return true, nil
	}

	klog.V(log.LogLevelInfo).InfoS("terraform plan has no changes")
	return false, nil
}

func (in *Terraform) init() v1.Tool {
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

// New creates a Terraform structure that implements v1.Tool interface.
func New(config v1.Config) v1.Tool {
	return (&Terraform{
		DefaultTool: v1.DefaultTool{Scanner: config.Scanner},
		workDir:     config.WorkDir,
		dir:         config.ExecDir,
		variables:   config.Variables,
		parallelism: config.Run.Parallelism,
		refresh:     config.Run.Refresh,
	}).init()
}
