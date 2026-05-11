package terraform

import (
	toolv1 "github.com/pluralsh/deployment-operator/pkg/harness/tool/v1"
)

// Terraform implements tool.Tool interface.
type Terraform struct {
	toolv1.DefaultTool

	// workDir is the root directory where the stack tarball was extracted.
	workDir string

	// dir is a working directory used by harness.
	dir string

	// planFileName is a terraform plan file name.
	// Default: terraform.tfplan
	planFileName string

	// variablesFileName is a terraform variables file name.
	// Default: plural.auto.tfvars.json
	variablesFileName string

	// variables is a JSON encoded string representing
	// terraform variable file.
	variables *string

	// parallelism is the number of parallel terraform operations.
	// Default: 10
	parallelism *int64

	// refresh is a flag to refresh the state.
	// Default: true
	refresh *bool
}
