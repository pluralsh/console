package pulumi

import (
	"fmt"
	"strings"

	"github.com/samber/lo"
)

func appendParallel(args []string, parallel *int64) []string {
	if parallel != nil {
		return append(args, fmt.Sprintf("--parallel=%d", *parallel))
	}

	return args
}

func appendRefresh(args []string, refresh *bool) []string {
	if refresh == nil {
		return args
	}

	if *refresh {
		return append(args, "--refresh")
	}

	return append(args, "--refresh=false")
}

func appendStack(args []string, stackName string) []string {
	if stackName == "" || lo.Contains(args, "--stack") {
		return args
	}

	return append(args, "--stack", stackName)
}

func appendNonInteractive(args []string) []string {
	if lo.Contains(args, "--non-interactive") {
		return args
	}

	return append(args, "--non-interactive")
}

// appendColor forces ANSI highlighting. Pulumi defaults to --color=auto, which
// disables color when stdout is not a TTY (as in harness step execution).
func appendColor(args []string) []string {
	for _, arg := range args {
		if arg == "--color" || strings.HasPrefix(arg, "--color=") {
			return args
		}
	}

	return append(args, "--color=always")
}

// Args implements [v1.ArgsModifier] type.
func (in *PreviewArgsModifier) Args(args []string) []string {
	if !lo.Contains(args, "preview") {
		return args
	}

	args = appendStack(args, in.stackName)
	args = appendParallel(args, in.parallel)
	args = appendRefresh(args, in.refresh)

	if !lo.Contains(args, "--save-plan") {
		args = append(args, "--save-plan", in.planFile)
	}

	return appendColor(appendNonInteractive(args))
}

// Args implements [v1.ArgsModifier] type.
func (in *UpArgsModifier) Args(args []string) []string {
	if !lo.Contains(args, "up") {
		return args
	}

	args = appendStack(args, in.stackName)
	args = appendParallel(args, in.parallel)
	args = appendRefresh(args, in.refresh)

	if !lo.Contains(args, "--plan") {
		args = append(args, "--plan", in.planFile)
	}

	if !lo.Contains(args, "--yes") {
		args = append(args, "--yes")
	}

	return appendColor(appendNonInteractive(args))
}

// Args implements [v1.ArgsModifier] type.
func (in *DestroyPreviewArgsModifier) Args(args []string) []string {
	if !lo.Contains(args, "destroy") {
		return args
	}

	args = appendStack(args, in.stackName)
	args = appendParallel(args, in.parallel)
	args = appendRefresh(args, in.refresh)

	if !lo.Contains(args, "--preview-only") {
		args = append(args, "--preview-only")
	}

	return appendColor(appendNonInteractive(args))
}

// Args implements [v1.ArgsModifier] type.
func (in *DestroyArgsModifier) Args(args []string) []string {
	if !lo.Contains(args, "destroy") {
		return args
	}

	args = appendStack(args, in.stackName)
	args = appendParallel(args, in.parallel)
	args = appendRefresh(args, in.refresh)

	if !lo.Contains(args, "--yes") {
		args = append(args, "--yes")
	}

	return appendColor(appendNonInteractive(args))
}
