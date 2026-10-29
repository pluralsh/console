// Package insightpriority evaluates the CustomInsightPriority scripts that override the built-in priority of failing
// objects in the cluster insights and the cluster health score.
//
// Scripts are sandboxed Python run by Monty. Unlike the Helm templating runtime they get no host callbacks, no OS access
// and no clock: everything a script can see is in its input, so the same input always gives the same priorities.
package insightpriority

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"
	"unicode/utf8"

	monty "github.com/pluralsh/gomonty"
)

const (
	// scriptName is shown in the errors of scripts.
	scriptName = "insight-priority.py"

	// EvaluationTimeout bounds one evaluation of a script.
	EvaluationTimeout = 2 * time.Second

	maxMemoryBytes = 64 << 20
	maxRecursion   = 100

	// chunkSize keeps every line of the input literal short, Monty reports columns as 16 bit numbers and a single
	// line that is too long makes it panic.
	chunkSize = 2000
)

// ErrInvalidScript means the script can not be compiled, or does not define evaluate.
var ErrInvalidScript = errors.New("invalid script")

func limits() *monty.ResourceLimits {
	return &monty.ResourceLimits{
		MaxDuration:       EvaluationTimeout,
		MaxMemory:         maxMemoryBytes,
		MaxRecursionDepth: maxRecursion,
	}
}

// Compile loads the script and checks that it defines evaluate. It does not call it.
func Compile(ctx context.Context, script string) (err error) {
	defer recoverFFI(&err)

	ctx, cancel := context.WithTimeout(ctx, EvaluationTimeout)
	defer cancel()

	repl, err := monty.NewRepl(monty.ReplOptions{ScriptName: scriptName, Limits: limits()})
	if err != nil {
		return fmt.Errorf("create Python REPL: %w", err)
	}
	defer repl.Close()

	if _, err := repl.FeedRun(ctx, script, monty.FeedOptions{}); err != nil {
		return fmt.Errorf("%w: %s", ErrInvalidScript, describe(ctx, err))
	}

	defined, err := repl.FeedRun(ctx, "type(evaluate).__name__", monty.FeedOptions{})
	if err != nil || defined.Raw() != "function" {
		return fmt.Errorf("%w: the script must define evaluate(input)", ErrInvalidScript)
	}

	return nil
}

// Run calls evaluate with the input and returns what it returned, as JSON.
func Run(ctx context.Context, script string, input any) (_ json.RawMessage, err error) {
	defer recoverFFI(&err)

	ctx, cancel := context.WithTimeout(ctx, EvaluationTimeout)
	defer cancel()

	encoded, err := json.Marshal(input)
	if err != nil {
		return nil, fmt.Errorf("serialize input: %w", err)
	}

	var chunks strings.Builder
	for len(encoded) > 0 {
		n := min(len(encoded), chunkSize)
		for n < len(encoded) && !utf8.RuneStart(encoded[n]) {
			n-- // never cut a character in half
		}
		quoted, _ := json.Marshal(string(encoded[:n]))
		chunks.Write(quoted)
		chunks.WriteString(",\n")
		encoded = encoded[n:]
	}

	repl, err := monty.NewRepl(monty.ReplOptions{ScriptName: scriptName, Limits: limits()})
	if err != nil {
		return nil, fmt.Errorf("create Python REPL: %w", err)
	}
	defer repl.Close()

	preamble := "import json as __json\n__input = __json.loads(''.join([\n" + chunks.String() + "]))\n"
	for _, source := range []string{preamble, script} {
		if _, err := repl.FeedRun(ctx, source, monty.FeedOptions{}); err != nil {
			return nil, errors.New(describe(ctx, err))
		}
	}

	result, err := repl.FeedRun(ctx, "__json.dumps(evaluate(__input))", monty.FeedOptions{})
	if err != nil {
		return nil, errors.New(describe(ctx, err))
	}

	raw, ok := result.Raw().(string)
	if !ok {
		return nil, errors.New("evaluate must return a dictionary")
	}

	return json.RawMessage(raw), nil
}

// recoverFFI turns a panic of the native runtime into an error, a broken script must never take the agent down.
func recoverFFI(err *error) {
	if r := recover(); r != nil {
		*err = fmt.Errorf("python runtime failed: %v", r)
	}
}

// describe renders an execution error without the input values that may be echoed in it.
func describe(ctx context.Context, err error) string {
	if ctxErr := ctx.Err(); ctxErr != nil {
		if errors.Is(ctxErr, context.DeadlineExceeded) {
			return fmt.Sprintf("timed out after %s", EvaluationTimeout)
		}
		return ctxErr.Error()
	}

	var syntax *monty.SyntaxError
	if errors.As(err, &syntax) {
		return "SyntaxError: " + firstLine(syntax.Error())
	}

	var runtimeErr *monty.RuntimeError
	if errors.As(err, &runtimeErr) {
		// Only the exception type: the message is script controlled and could carry the input of other namespaces
		// into a status that namespace users can read.
		message, _, _ := strings.Cut(firstLine(runtimeErr.Error()), ":")
		message = strings.TrimSpace(message)
		if len(runtimeErr.Frames) > 0 {
			frame := runtimeErr.Frames[0]
			return fmt.Sprintf("%s (line %d)", message, frame.Line)
		}
		return message
	}

	return firstLine(err.Error())
}

func firstLine(s string) string {
	line, _, _ := strings.Cut(s, "\n")
	return line
}
