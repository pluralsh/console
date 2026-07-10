package pulumi

import (
	toolv1 "github.com/pluralsh/console/go/deployment-operator/pkg/harness/tool/v1"
)

const (
	defaultStackName  = "dev"
	defaultBackendURL = "file:///plural/.pulumi"
	planFileName      = "pulumi.plan"
)

// Pulumi implements tool.Tool interface.
type Pulumi struct {
	toolv1.DefaultTool

	workDir string
	dir     string

	stackName string
	planFile  string
	destroy   bool

	parallel *int64
	refresh  *bool
}
