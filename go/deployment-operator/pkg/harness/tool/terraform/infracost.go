package terraform

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"

	console "github.com/pluralsh/console/go/client"
	"github.com/samber/lo"
	"k8s.io/klog/v2"

	harnessexec "github.com/pluralsh/console/go/deployment-operator/pkg/harness/exec"
	"github.com/pluralsh/console/go/deployment-operator/pkg/log"
)

const infracostAPIKeyEnv = "INFRACOST_API_KEY"

// Infracost implements [v1.Tool] interface.
// It runs infracost breakdown on the terraform plan and returns cost estimates.
// Infracost is only executed when the stack run provides an INFRACOST_API_KEY
// environment variable, which acts as both the toggle and the credential.
func (in *Terraform) Infracost() ([]*console.StackInfracostResourceAttributes, error) {
	if !in.infracostEnabled() {
		klog.V(log.LogLevelDebug).Info("INFRACOST_API_KEY not set on stack run, skipping cost estimation")
		return nil, nil
	}

	if !in.infracostAvailable() {
		klog.V(log.LogLevelDebug).Info("infracost binary not found in PATH, skipping cost estimation")
		return nil, nil
	}

	report, err := in.runInfracost()
	if err != nil {
		return nil, fmt.Errorf("failed to run infracost: %w", err)
	}

	resources := in.convertInfracostReport(report)
	klog.V(log.LogLevelDebug).InfoS("infracost breakdown completed", "resourceCount", len(resources))

	return resources, nil
}

// infracostEnabled returns true if the stack run provided an INFRACOST_API_KEY
// environment variable with a non-empty value.
func (in *Terraform) infracostEnabled() bool {
	prefix := infracostAPIKeyEnv + "="
	for _, e := range in.env {
		if strings.HasPrefix(e, prefix) && len(e) > len(prefix) {
			return true
		}
	}
	return false
}

// infracostAvailable checks if the infracost binary is available in PATH.
func (in *Terraform) infracostAvailable() bool {
	_, err := exec.LookPath("infracost")
	return err == nil
}

// runInfracost executes infracost breakdown and returns the parsed report.
// Infracost does not accept binary terraform plan files, so we first convert
// the plan to JSON using 'terraform show -json', write it to a temp file,
// and then pass that to infracost.
func (in *Terraform) runInfracost() (*InfracostReport, error) {
	tmpFile, err := in.terraformPlanToJSONFile()
	if err != nil {
		return nil, err
	}
	defer os.Remove(tmpFile)

	// Run infracost breakdown with the JSON plan file. Pass the stack run env
	// vars through so that INFRACOST_API_KEY (and any other infracost config)
	// is available to the subprocess.
	output, err := harnessexec.NewExecutable(
		"infracost",
		harnessexec.WithArgs([]string{"breakdown", "--path", tmpFile, "--format", "json"}),
		harnessexec.WithDir(in.dir),
		harnessexec.WithEnv(in.env),
	).RunWithOutput(context.Background())
	if err != nil {
		return nil, fmt.Errorf("failed executing infracost breakdown: %s: %w", string(output), err)
	}

	var report InfracostReport
	if err := json.Unmarshal(output, &report); err != nil {
		return nil, fmt.Errorf("failed unmarshaling infracost JSON: %w", err)
	}

	klog.V(log.LogLevelTrace).InfoS("infracost report parsed successfully", "projects", len(report.Projects))
	return &report, nil
}

// terraformPlanToJSONFile runs 'terraform show -json <planFile>' and streams
// stdout directly into a temp file, returning the temp file path. The caller
// is responsible for removing the file. Streaming avoids buffering the entire
// plan JSON (which can be large) in memory.
func (in *Terraform) terraformPlanToJSONFile() (string, error) {
	tmpFile, err := os.CreateTemp("", "plan-*.json")
	if err != nil {
		return "", fmt.Errorf("failed creating temp file for plan JSON: %w", err)
	}

	cmd := exec.CommandContext(context.Background(), "terraform", "show", "-json", in.planFileName)
	cmd.Dir = in.dir
	cmd.Stdout = tmpFile
	var stderr bytes.Buffer
	cmd.Stderr = &stderr

	klog.V(log.LogLevelExtended).InfoS("executing", "command", "terraform show -json "+in.planFileName)

	runErr := cmd.Run()
	if closeErr := tmpFile.Close(); closeErr != nil && runErr == nil {
		runErr = closeErr
	}
	if runErr != nil {
		_ = os.Remove(tmpFile.Name())
		return "", fmt.Errorf("failed converting plan to JSON: %s: %w", stderr.String(), runErr)
	}

	klog.V(log.LogLevelTrace).InfoS("converted terraform plan to JSON", "tempFile", filepath.Base(tmpFile.Name()))
	return tmpFile.Name(), nil
}

// convertInfracostReport converts an InfracostReport to console StackInfracostResourceAttributes.
func (in *Terraform) convertInfracostReport(report *InfracostReport) []*console.StackInfracostResourceAttributes {
	if report == nil {
		return nil
	}

	result := make([]*console.StackInfracostResourceAttributes, 0)

	for _, project := range report.Projects {
		projectName := project.Name

		// Process breakdown resources
		if project.Breakdown != nil {
			result = append(result, in.convertBreakdownResources(
				project.Breakdown.Resources,
				InfracostResourceScopeBreakdown,
				projectName,
			)...)
		}

		// Process diff resources
		if project.Diff != nil {
			result = append(result, in.convertBreakdownResources(
				project.Diff.Resources,
				InfracostResourceScopeDiff,
				projectName,
			)...)
		}

		// Process past breakdown resources
		if project.PastBreakdown != nil {
			result = append(result, in.convertBreakdownResources(
				project.PastBreakdown.Resources,
				InfracostResourceScopePastBreakdown,
				projectName,
			)...)
		}
	}

	return result
}

// convertBreakdownResources converts a list of InfracostResource to console attributes.
func (in *Terraform) convertBreakdownResources(
	resources []InfracostResource,
	scope InfracostResourceScope,
	projectName string,
) []*console.StackInfracostResourceAttributes {
	result := make([]*console.StackInfracostResourceAttributes, 0, len(resources))

	for _, resource := range resources {
		attr := in.convertResource(resource, scope, projectName)
		if attr != nil {
			result = append(result, attr)
		}

		// Also process subresources recursively
		if len(resource.SubResources) > 0 {
			result = append(result, in.convertBreakdownResources(
				resource.SubResources,
				scope,
				projectName,
			)...)
		}
	}

	return result
}

// convertResource converts a single InfracostResource to console StackInfracostResourceAttributes.
func (in *Terraform) convertResource(
	resource InfracostResource,
	scope InfracostResourceScope,
	projectName string,
) *console.StackInfracostResourceAttributes {
	hourlyCost := parseStringToFloat(resource.HourlyCost)
	monthlyCost := parseStringToFloat(resource.MonthlyCost)

	// Skip resources with no cost (free tier or unsupported)
	if hourlyCost == nil && monthlyCost == nil {
		return nil
	}

	return &console.StackInfracostResourceAttributes{
		ResourceScope: string(scope),
		ProjectName:   lo.ToPtr(projectName),
		Name:          resource.Name,
		ResourceType:  lo.ToPtr(resource.ResourceType),
		HourlyCost:    hourlyCost,
		MonthlyCost:   monthlyCost,
	}
}

// parseStringToFloat converts a string cost value to a float pointer.
// Returns nil if the string is nil, empty, or cannot be parsed.
func parseStringToFloat(s *string) *float64 {
	if s == nil || *s == "" {
		return nil
	}

	val, err := strconv.ParseFloat(*s, 64)
	if err != nil {
		return nil
	}

	return &val
}
