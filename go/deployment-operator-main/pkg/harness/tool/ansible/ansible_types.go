package ansible

import (
	v1 "github.com/pluralsh/deployment-operator/pkg/harness/tool/v1"
)

// Ansible implements tool.Tool interface.
type Ansible struct {
	v1.DefaultTool

	// workDir
	workDir string

	// execDir
	execDir string

	// planFileName
	planFileName string

	// planFilePath
	planFilePath string

	// variablesFileName is an ansible variables file name.
	// Default: plural.variables.json
	variablesFileName string

	// variables is a JSON encoded string representing
	// ansible variable file.
	variables *string

	SSHKeyFile *string

	ConfigFile *string

	consoleURL string

	consoleToken string
}
