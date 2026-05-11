package v1

import (
	"io"

	console "github.com/pluralsh/console/go/client"

	securityv1 "github.com/pluralsh/deployment-operator/pkg/harness/security/v1"

	stackrunv1 "github.com/pluralsh/deployment-operator/pkg/harness/stackrun/v1"
)

// Tool handles one of the supported infrastructure management tools.
// List of supported tools is based on the gqlclient.StackType.
// It is mainly responsible for:
// - gathering state/plan information after successful run from local files
// - gathering any available outputs from local files
// - providing runtime modifiers to alter step command execution arguments, env, etc.
type Tool interface {
	// Scan tries to scan the state/plan information based on local files.
	Scan() ([]*console.StackPolicyViolationAttributes, error)
	// Plan tries to assemble plan information based on local files
	// created by specific tool after PLAN stage. It then transforms it
	// into gqlclient.StackStateAttributes.
	Plan() (*console.StackStateAttributes, error)
	// State tries to assemble state/plan information based on local files
	// created by specific tool after all steps are finished running. It then
	// transforms this information into gqlclient.StackStateAttributes.
	State() (*console.StackStateAttributes, error)
	// Output tries to find any available outputs information based on local files
	// created by specific tool after all steps are finished running. It then
	// transforms this information into gqlclient.StackOutputAttributes.
	Output() ([]*console.StackOutputAttributes, error)
	// ConfigureStateBackend manages the configuration of remote backend if
	// supported by specific tool.
	ConfigureStateBackend(actor, deployToken string, urls *console.StackRunBaseFragment_StateUrls) error
	// Modifier returns specific modifier implementation based on the
	// current step stage. Modifiers can for example alter arguments of the
	// executable step command.
	Modifier(stage console.StepStage) Modifier
	// HasChanges deterministically checks if the plan contains any changes.
	// Returns true if changes are detected, false for no-op plans.
	// This allows the harness to skip unnecessary apply steps and not wait for approvals to free up resources.
	HasChanges() (bool, error)
}

// DefaultTool implements [Tool] interface.
type DefaultTool struct {
	// Scanner is a security scanner. See [securityv1.Scanner] for more information.
	Scanner securityv1.Scanner
}

// Modifier can do many different runtime modifications
// of the provided stack run steps. For example, it can
// alter arguments of the executable step command or provide
// a custom writer that can capture step command output.
type Modifier interface {
	ArgsModifier
	EnvModifier
	PassthroughModifier
}

type ArgsModifier interface {
	// Args allows modifying stack run step arguments before
	// execution.
	Args(args []string) []string
}

type EnvModifier interface {
	// Env allows modifying stack run step env vars before
	// execution.
	Env(env []string) []string
}

type PassthroughModifier interface {
	// WriteCloser provides a custom array of [io.WriteCloser].
	// Related stack run step output will be proxied all of them.
	WriteCloser() []io.WriteCloser
}

// DefaultModifier implements [Modifier] interface.
type DefaultModifier struct{}

// multiModifier implements [Modifier] interface.
// It allows combining multiple modifiers into a single one.
type multiModifier struct {
	modifiers []Modifier
}

type Config struct {
	// WorkDir is the working directory for the tool.
	WorkDir string

	// ExecDir is the execution directory for the tool.
	ExecDir string

	// Variables is a JSON encoded string representing
	// tool variables.
	Variables *string

	// Scanner is a security scanner. See [securityv1.Scanner] for more information.
	Scanner securityv1.Scanner

	// Run is a stack run that is being processed.
	Run *stackrunv1.StackRun

	ConsoleURL string

	ConsoleToken string
}
