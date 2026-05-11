package terraform

import (
	v1 "github.com/pluralsh/deployment-operator/pkg/harness/tool/v1"
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
}
