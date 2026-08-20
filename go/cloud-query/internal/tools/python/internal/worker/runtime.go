package worker

import (
	"context"
	"errors"
	"strconv"
	"strings"
	"time"

	monty "github.com/ewhauser/gomonty"

	"github.com/pluralsh/console/go/cloud-query/internal/tools/python/internal/contract"
)

const executionTimeout = 10 * time.Second
const maxMemoryBytes = 64 << 20
const maxRecursionDepth = 200

type montyRuntime struct {
	now func() time.Time
}

func newMontyRuntime() *montyRuntime { return &montyRuntime{now: time.Now} }

func (m *montyRuntime) Health() error {
	_, err := monty.NewRepl(monty.ReplOptions{
		ScriptName: "workbench.py",
		Limits:     m.limits(),
	})
	if err != nil {
		return contract.InternalError(err)
	}
	return nil
}

func (m *montyRuntime) Run(ctx context.Context, script, inputJSON string) (*contract.RunOutput, error) {
	input, err := contract.ValidateRun(contract.RunInput{Script: script, InputJSON: inputJSON})
	if err != nil {
		return nil, err
	}

	repl, err := monty.NewRepl(monty.ReplOptions{
		ScriptName: "workbench.py",
		Limits:     m.limits(),
	})
	if err != nil {
		return nil, contract.InternalError(err)
	}

	ctx, cancel := context.WithTimeout(ctx, executionTimeout)
	defer cancel()

	initialization := "import json as __workbench_json\n" +
		"input = __workbench_json.loads(" + strconv.Quote(input.InputJSON) + ")\n" +
		"output = {}"

	if _, err = repl.FeedRun(ctx, initialization, m.feedOptions()); err != nil {
		return nil, m.mapError(err)
	}

	var stdout strings.Builder
	tooLarge := false
	printFn := func(stream, text string) {
		if stream != "stdout" {
			return
		}
		if stdout.Len()+len(text) > contract.MaxStdoutBytes {
			tooLarge = true
			return
		}
		stdout.WriteString(text)
	}

	options := m.feedOptions()
	options.Print = printFn
	if _, err = repl.FeedRun(ctx, input.Script, options); err != nil {
		return nil, m.mapError(err)
	}

	if tooLarge {
		return nil, contract.Exhausted("python stdout exceeds the stdout limit", nil)
	}

	value, err := repl.FeedRun(ctx, "__workbench_json.dumps(output)", m.feedOptions())
	if err != nil {
		return nil, m.mapError(err)
	}

	result, ok := value.Raw().(string)
	if !ok || !contract.IsJSONObject(result) {
		return nil, contract.Invalid("output must be a JSON object", nil)
	}

	if len(result) > contract.MaxResultBytes {
		return nil, contract.Exhausted("python result exceeds the result limit", nil)
	}

	return &contract.RunOutput{
		ResultJSON: result,
		Stdout:     stdout.String(),
	}, nil
}

func (m *montyRuntime) feedOptions() monty.FeedOptions {
	return monty.FeedOptions{OS: m.handleOS}
}

func (m *montyRuntime) limits() *monty.ResourceLimits {
	return &monty.ResourceLimits{
		MaxDuration:       executionTimeout,
		MaxMemory:         maxMemoryBytes,
		MaxRecursionDepth: maxRecursionDepth,
	}
}

func (m *montyRuntime) mapError(err error) error {
	if errors.Is(err, context.DeadlineExceeded) {
		return contract.Deadline(err)
	}

	var syntax *monty.SyntaxError
	if errors.As(err, &syntax) {
		return contract.Invalid("python code is invalid", err)
	}

	var runtime *monty.RuntimeError
	if !errors.As(err, &runtime) {
		return contract.InternalError(err)
	}

	kind, detail, ok := strings.Cut(strings.TrimSpace(runtime.Error()), ":")
	if !ok {
		kind, detail = "Exception", runtime.Error()
	}

	switch kind {
	case "SyntaxError", "TypeError":
		return contract.Invalid(m.toErrorSummary(kind, detail), err)
	case "MemoryError", "RecursionError":
		return contract.Exhausted("python resource limit exceeded", err)
	case "TimeoutError":
		return contract.Deadline(err)
	case "ResourceError":
		if strings.Contains(strings.ToLower(detail), "time") || strings.Contains(strings.ToLower(detail), "duration") {
			return contract.Deadline(err)
		}
		return contract.Exhausted("python resource limit exceeded", err)
	default:
		return contract.Failed(m.toErrorSummary(kind, detail), err)
	}
}

func (m *montyRuntime) toErrorSummary(kind, detail string) string {
	kind = strings.TrimSpace(kind)
	detail = strings.Join(strings.Fields(detail), " ")

	if kind == "" {
		kind = "Exception"
	}

	if detail == "" {
		return "python " + kind
	}
	return "python " + kind + ": " + detail
}
