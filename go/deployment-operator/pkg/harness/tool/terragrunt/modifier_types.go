package terragrunt

import (
	v1 "github.com/pluralsh/console/go/deployment-operator/pkg/harness/tool/v1"
)

// PlanArgsModifier implements [v1.ArgsModifier] interface.
type PlanArgsModifier struct {
	v1.DefaultModifier

	// planFileName
	planFileName string

	// parallelism
	parallelism *int64

	// refresh
	refresh *bool

	// runAll adds terragrunt run --all plan output flags instead of -out.
	runAll bool

	// outDir is the terragrunt --out-dir for a runAll plan.
	outDir string

	// jsonOutDir is the terragrunt --json-out-dir for a runAll plan.
	jsonOutDir string
}

// ApplyArgsModifier implements [v1.ArgsModifier] interface.
type ApplyArgsModifier struct {
	v1.DefaultModifier

	// planFileName
	planFileName string

	// dir
	dir string

	// parallelism
	parallelism *int64

	// refresh
	refresh *bool

	// runAll reuses the saved plan directory. Changed units are selected later.
	runAll bool

	// outDir is the terragrunt --out-dir for a runAll apply.
	outDir string

	// jsonOutDir is where runAll plan JSON is read to find changed units.
	jsonOutDir string
}
