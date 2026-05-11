package ansible

import (
	v1 "github.com/pluralsh/deployment-operator/pkg/harness/tool/v1"
)

// PassthroughModifier implements [v1.PassthroughModifier] interface.
type PassthroughModifier struct {
	v1.DefaultModifier

	// planFile
	planFile string
}

// GlobalEnvModifier implements [v1.EnvModifier] interface.
type GlobalEnvModifier struct {
	v1.DefaultModifier

	// workDir
	workDir    string
	ConfigFile *string

	consoleToken string
	consoleURL   string
}

type VariableInjectorModifier struct {
	v1.DefaultModifier

	// variablesFile
	variablesFile string
}

type VariableModifier struct {
	v1.DefaultModifier

	SSHKeyFile *string
}

const (
	ansibleDir    = ".ansible"
	ansibleTmpDir = "tmp"
)
