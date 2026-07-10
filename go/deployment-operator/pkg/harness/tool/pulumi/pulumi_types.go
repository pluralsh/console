package pulumi

import (
	toolv1 "github.com/pluralsh/console/go/deployment-operator/pkg/harness/tool/v1"
)

const (
	defaultStackName  = "dev"
	defaultBackendURL = "https://api.pulumi.com"
	planFileName      = "pulumi.plan"
)

// Pulumi implements tool.Tool interface.
type Pulumi struct {
	toolv1.DefaultTool

	workDir string
	dir     string

	stackName  string
	backendURL string
	planFile   string
	destroy    bool
	env        []string
	variables  *string

	parallel *int64
	refresh  *bool
}
