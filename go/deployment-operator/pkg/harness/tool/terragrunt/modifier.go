package terragrunt

import (
	"fmt"
	"path"

	"github.com/samber/lo"
	"k8s.io/klog/v2"

	"github.com/pluralsh/console/go/deployment-operator/internal/helpers"
	v1 "github.com/pluralsh/console/go/deployment-operator/pkg/harness/tool/v1"
)

// Args implements [v1.ArgsModifier] type.
func (in *PlanArgsModifier) Args(args []string) []string {
	if !lo.Contains(args, "plan") {
		return args
	}

	if in.runAll {
		args = insertBeforeSubcommand(args, "--out-dir", in.outDir, "--json-out-dir", in.jsonOutDir)
	}

	if in.parallelism != nil {
		args = append(args, fmt.Sprintf("-parallelism=%d", *in.parallelism))
	}

	if in.refresh != nil {
		args = append(args, fmt.Sprintf("-refresh=%t", *in.refresh))
	}

	if in.runAll {
		return args
	}

	return append(args, fmt.Sprintf("-out=%s", in.planFileName))
}

func (in *Terragrunt) NewPlanArgsModifier(planFileName string) v1.Modifier {
	return &PlanArgsModifier{
		planFileName: planFileName,
		parallelism:  in.parallelism,
		refresh:      in.refresh,
		runAll:       in.runAll,
		outDir:       in.outDir,
		jsonOutDir:   in.jsonOutDir,
	}
}

// Args implements [v1.ArgsModifier] type.
func (in *ApplyArgsModifier) Args(args []string) []string {
	if !lo.Contains(args, "apply") {
		return args
	}

	if in.runAll {
		args = insertBeforeSubcommand(args, "--out-dir", in.outDir)
		filters, err := changedUnitFilters(in.jsonOutDir)
		if err != nil {
			klog.ErrorS(err, "could not determine changed terragrunt units")
			return args
		}

		return insertBeforeSubcommand(args, filters...)
	}

	if !helpers.Exists(path.Join(in.dir, in.planFileName)) || lo.Contains(args, in.planFileName) {
		return args
	}

	if in.parallelism != nil {
		args = append(args, fmt.Sprintf("-parallelism=%d", *in.parallelism))
	}

	return append(args, in.planFileName)
}

func (in *Terragrunt) NewApplyArgsModifier(dir, planFileName string) v1.Modifier {
	return &ApplyArgsModifier{
		planFileName: planFileName,
		dir:          dir,
		parallelism:  in.parallelism,
		refresh:      in.refresh,
		runAll:       in.runAll,
		outDir:       in.outDir,
		jsonOutDir:   in.jsonOutDir,
	}
}

// insertBeforeSubcommand places terragrunt flags immediately before plan, apply, or destroy.
func insertBeforeSubcommand(args []string, flags ...string) []string {
	if len(flags) == 0 {
		return args
	}

	for i, arg := range args {
		if arg == "plan" || arg == "apply" || arg == "destroy" {
			out := make([]string, 0, len(args)+len(flags))
			out = append(out, args[:i]...)
			out = append(out, flags...)
			out = append(out, args[i:]...)
			return out
		}
	}

	return append(args, flags...)
}
