package v1

import (
	console "github.com/pluralsh/console/go/client"
)

// State implements [Tool] interface.
func (in *DefaultTool) State() (*console.StackStateAttributes, error) {
	return nil, nil
}

// Output implements [Tool] interface.
func (in *DefaultTool) Output() ([]*console.StackOutputAttributes, error) {
	return []*console.StackOutputAttributes{}, nil
}

// ConfigureStateBackend implements [Tool] interface.
func (in *DefaultTool) ConfigureStateBackend(_, _ string, _ *console.StackRunBaseFragment_StateUrls) error {
	return nil
}

// Plan implements [Tool] interface.
func (in *DefaultTool) Plan() (*console.StackStateAttributes, error) {
	return nil, nil
}

// Modifier implements [Tool] interface.
func (in *DefaultTool) Modifier(stage console.StepStage) Modifier {
	return nil
}

// Scan implements [Tool] interface.
func (in *DefaultTool) Scan() ([]*console.StackPolicyViolationAttributes, error) {
	return []*console.StackPolicyViolationAttributes{}, nil
}

// HasChanges implements [Tool] interface.
// The default implementation returns true (assumes changes exist).
// Tool-specific implementations should override this for deterministic detection.
func (in *DefaultTool) HasChanges() (bool, error) {
	return true, nil
}

func New() Tool {
	return &DefaultTool{}
}
