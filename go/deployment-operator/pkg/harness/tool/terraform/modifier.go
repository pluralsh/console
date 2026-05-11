package terraform

import (
	"fmt"
	"path"

	"github.com/samber/lo"

	"github.com/pluralsh/deployment-operator/internal/helpers"
	v1 "github.com/pluralsh/deployment-operator/pkg/harness/tool/v1"
)

// Args implements [v1.ArgsModifier] type.
func (in *PlanArgsModifier) Args(args []string) []string {
	if !lo.Contains(args, "plan") {
		return args
	}

	if in.parallelism != nil {
		args = append(args, fmt.Sprintf("-parallelism=%d", *in.parallelism))
	}

	if in.refresh != nil {
		args = append(args, fmt.Sprintf("-refresh=%t", *in.refresh))
	}

	return append(args, fmt.Sprintf("-out=%s", in.planFileName))
}

func (in *Terraform) NewPlanArgsModifier(planFileName string) v1.Modifier {
	return &PlanArgsModifier{planFileName: planFileName, parallelism: in.parallelism, refresh: in.refresh}
}

// Args implements [v1.ArgsModifier] type.
func (in *ApplyArgsModifier) Args(args []string) []string {
	if !lo.Contains(args, "apply") {
		return args
	}

	if !helpers.Exists(path.Join(in.dir, in.planFileName)) || lo.Contains(args, in.planFileName) {
		return args
	}

	if in.parallelism != nil {
		args = append(args, fmt.Sprintf("-parallelism=%d", *in.parallelism))
	}

	return append(args, in.planFileName)
}

func (in *Terraform) NewApplyArgsModifier(dir, planFileName string) v1.Modifier {
	return &ApplyArgsModifier{planFileName: planFileName, dir: dir, parallelism: in.parallelism, refresh: in.refresh}
}
