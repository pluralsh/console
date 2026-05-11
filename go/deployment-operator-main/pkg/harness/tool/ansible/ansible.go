package ansible

import (
	"os"
	"path"

	console "github.com/pluralsh/console/go/client"
	"github.com/samber/lo"
	"k8s.io/klog/v2"

	"github.com/pluralsh/deployment-operator/internal/helpers"
	v1 "github.com/pluralsh/deployment-operator/pkg/harness/tool/v1"
	"github.com/pluralsh/deployment-operator/pkg/log"
)

// Plan implements [v1.Tool] interface.
func (in *Ansible) Plan() (*console.StackStateAttributes, error) {
	output, err := os.ReadFile(in.planFilePath)
	if err != nil {
		return nil, err
	}

	klog.V(log.LogLevelTrace).InfoS("ansible plan file read successfully", "file", in.planFilePath, "output", string(output))
	return &console.StackStateAttributes{
		Plan: lo.ToPtr(string(output)),
	}, nil
}

// Modifier implements [v1.Tool] interface.
func (in *Ansible) Modifier(stage console.StepStage) v1.Modifier {
	modifiers := []v1.Modifier{NewGlobalEnvModifier(in.workDir, in.consoleURL, in.consoleToken, in.ConfigFile)}

	if in.variables != nil {
		modifiers = append(modifiers, NewVariableInjectorModifier(in.variablesFileName))
	}

	if stage == console.StepStagePlan {
		modifiers = append(modifiers, NewVariableModifier(in.SSHKeyFile))
		modifiers = append(modifiers, NewPassthroughModifier(in.planFilePath))
	}
	if stage == console.StepStageApply {
		modifiers = append(modifiers, NewVariableModifier(in.SSHKeyFile))
	}

	return v1.NewMultiModifier(modifiers...)
}

func (in *Ansible) init() *Ansible {
	if len(in.workDir) == 0 {
		klog.Fatal("workdir is required")
	}

	if len(in.execDir) == 0 {
		klog.Fatal("execdir is required")
	}

	in.planFileName = "ansible.plan"
	in.planFilePath = path.Join(in.execDir, in.planFileName)
	helpers.EnsureFileOrDie(in.planFilePath, nil)

	return in
}

// New creates an Ansible structure that implements v1.Tool interface.
func New(config v1.Config) v1.Tool {
	return (&Ansible{
		DefaultTool:  v1.DefaultTool{Scanner: config.Scanner},
		workDir:      config.WorkDir,
		execDir:      config.ExecDir,
		SSHKeyFile:   config.Run.SSHKeyFile,
		ConfigFile:   config.Run.ConfigFile,
		consoleURL:   config.ConsoleURL,
		consoleToken: config.ConsoleToken,
	}).init()
}
