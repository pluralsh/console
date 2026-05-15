package exec

import (
	"bufio"
	"fmt"
	"io"

	console "github.com/pluralsh/console/go/client"
)

// OutputAnalyzer captures the command output
// and attempts to detect potential errors.
type OutputAnalyzer interface {
	Stdout() io.Writer
	Stderr() io.Writer

	// Detect scans the output for potential errors.
	// It uses a custom heuristics to detect issues.
	// It can result in a false positives.
	//
	// Note: Make sure that it is executed after Write
	//		 has finished to ensure proper detection.
	Detect() []error
}

type OutputAnalyzerHeuristic interface {
	Detect(input *bufio.Scanner) Errors
}

type Error struct {
	line    int
	message string
}

func (in Error) ToError() error {
	return fmt.Errorf("[%d] %s", in.line, in.message)
}

type Errors []Error

func (in Errors) ToErrors() []error {
	errors := make([]error, 0, len(in))
	for _, err := range in {
		errors = append(errors, err.ToError())
	}

	return errors
}

// AnalyzerOption is a functional option for configuring an OutputAnalyzer.
type AnalyzerOption func(*analyzerConfig)

type analyzerConfig struct {
	checkStderr bool
}

// WithStderrCheck enables or disables treating stderr output as an error.
func WithStderrCheck(check bool) AnalyzerOption {
	return func(c *analyzerConfig) {
		c.checkStderr = check
	}
}

// stderrCheckProviders is the set of providers for which stderr is treated as an error.
var stderrCheckProviders = map[console.StackType]bool{
	console.StackTypeTerraform: true,
}

// StderrCheckForProvider returns an AnalyzerOption that enables stderr checking
// only for providers where stderr reliably indicates errors (e.g. Terraform),
// and disables it for providers that write non-error output to stderr (e.g. Ansible).
func StderrCheckForProvider(provider console.StackType) AnalyzerOption {
	return WithStderrCheck(stderrCheckProviders[provider])
}
