package trivy

import (
	"context"
	"encoding/json"
	"path"
	"strings"

	console "github.com/pluralsh/console/go/client"
	"github.com/samber/lo"
	"k8s.io/klog/v2"

	"github.com/pluralsh/deployment-operator/pkg/harness/exec"
	v1 "github.com/pluralsh/deployment-operator/pkg/harness/security/v1"
	loglevel "github.com/pluralsh/deployment-operator/pkg/log"
)

const (
	// customPoliciesDir is the subdirectory within the stack tarball root
	// that contains custom Rego/OPA policy checks.
	customPoliciesDir = ".plural/policies"
)

// Scan implements [v1.Scanner.Scan] interface.
func (in *Scanner) Scan(tool console.StackType, options ...v1.ScanOption) ([]*console.StackPolicyViolationAttributes, error) {
	opts := &v1.ScanOptions{}
	for _, option := range options {
		option(opts)
	}

	return in.scan(tool, opts)
}

// scan performs the actual scan for a given tool.
func (in *Scanner) scan(tool console.StackType, options *v1.ScanOptions) ([]*console.StackPolicyViolationAttributes, error) {
	switch tool {
	case console.StackTypeTerraform:
		return in.scanTerraform(options)
	default:
		klog.Fatalf("unsupported tool type: %s", tool)
		return nil, nil
	}
}

// scanTerraform performs a scan for Terraform.
func (in *Scanner) scanTerraform(options *v1.ScanOptions) ([]*console.StackPolicyViolationAttributes, error) {
	args := []string{
		"config",
	}

	var configChecks []string
	var checkNamespaces []string

	if in.CustomPolicies {
		configChecks = append(configChecks, path.Join(options.Terraform.WorkDir, customPoliciesDir))
		// "user" namespace must be explicitly registered so Trivy evaluates
		// custom Rego policies loaded from customPoliciesDir. Without it,
		// Trivy silently ignores any policy whose package name starts with
		// "user." (e.g. data.user.terraform.custom.*).
		checkNamespaces = append(checkNamespaces, "user")
	}

	if len(in.PolicyPaths) > 0 {
		configChecks = append(configChecks, in.PolicyPaths...)
		checkNamespaces = append(checkNamespaces, in.PolicyNamespaces...)
	}

	if len(configChecks) > 0 {
		args = append(args, "--config-check", strings.Join(configChecks, ","))
	}

	if len(checkNamespaces) > 0 {
		args = append(args, "--check-namespaces", strings.Join(checkNamespaces, ","))
	}

	args = append(args, []string{
		"-f", "json",
		"-q",
		"--tf-vars", options.Terraform.VariablesFileName,
		options.Terraform.PlanFileName,
	}...)

	output, err := exec.NewExecutable(
		"trivy",
		exec.WithArgs(args),
		exec.WithDir(options.Terraform.Dir),
	).RunWithOutput(context.Background())
	if err != nil {
		return nil, err
	}

	klog.V(loglevel.LogLevelTrace).InfoS("trivy output", "output", string(output))
	return in.toAttributes(output)
}

// toAttributes converts the Trivy output to a list of attributes.
func (in *Scanner) toAttributes(data []byte) ([]*console.StackPolicyViolationAttributes, error) {
	report := &Report{}
	if err := json.Unmarshal(data, report); err != nil {
		return nil, err
	}

	return report.Attributes(), nil
}

// New creates a new Trivy scanner.
func New(config *console.PolicyEngineFragment) v1.Scanner {
	return &Scanner{
		DefaultScanner: v1.DefaultScanner{},
		CustomPolicies: lo.FromPtr(config.GetCustomPolicies()),
	}
}
