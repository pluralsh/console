package v1

import (
	console "github.com/pluralsh/console/go/client"
)

// ScannerType defines the type of [Scanner] to be used.
type ScannerType string

// Scanner is an interface for security scanning tools.
type Scanner interface {
	Scan(tool console.StackType, options ...ScanOption) (violations []*console.StackPolicyViolationAttributes, err error)
}

// DefaultScanner is a base [Scanner] struct that holds shared configuration variables.
type DefaultScanner struct {
	// PolicyPaths defines the paths to the policy files.
	PolicyPaths []string

	// PolicyNamespaces defines the namespaces where the policies should be applied.
	PolicyNamespaces []string
}

// Config is a struct that holds configuration variables for [Scanner].
type Config struct{}
