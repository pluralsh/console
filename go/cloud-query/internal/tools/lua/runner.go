package lua

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/pluralsh/console/go/polly/luautils"
	lua "github.com/yuin/gopher-lua"
)

const defaultTimeout = 30 * time.Second

// RunInput holds the parameters for a sandboxed Lua execution.
type RunInput struct {
	// Script is the Lua source code to execute.
	Script string
	// Timeout overrides the default 30-second execution limit.
	Timeout time.Duration
}

// RunOutput holds the result of a sandboxed Lua execution.
type RunOutput struct {
	// ResultJSON is the JSON-encoded value produced by the script.
	// The value is taken from the global variable `output`.
	ResultJSON string
}

// Run executes a Lua script inside a heavily sandboxed state and returns the
// result as a JSON string.
//
// Sandbox constraints:
//   - No OS, filesystem, network, io, or debug libraries.
//   - No package/require system (cannot load arbitrary modules).
//   - Only safe stdlib: base, string, table, math.
//   - Custom modules: encoding (json/yaml) and utils (merge, splitString, pathJoin).
//   - Hard execution timeout enforced via context cancellation.
func Run(ctx context.Context, input RunInput) (*RunOutput, error) {
	timeout := input.Timeout
	if timeout <= 0 {
		timeout = defaultTimeout
	}

	ctx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	l := newSandboxedState(ctx)
	defer l.Close()

	// Register output variable to capture script results.
	outputTable := l.NewTable()
	l.SetGlobal("output", outputTable)

	// Execute the script, capturing any return values.
	if err := l.DoString(input.Script); err != nil {
		return nil, fmt.Errorf("lua execution error: %w", err)
	}

	// Check context after execution in case it timed out right at the boundary.
	if err := ctx.Err(); err != nil {
		return nil, fmt.Errorf("lua execution timed out: %w", err)
	}

	result, err := extractOutput(l)
	if err != nil {
		return nil, err
	}

	return &RunOutput{ResultJSON: result}, nil
}

// newSandboxedState creates a new Lua VM with only safe standard libraries and
// the encoding/utils custom modules from polly's luautils.
func newSandboxedState(ctx context.Context) *lua.LState {
	l := lua.NewState(lua.Options{
		SkipOpenLibs: true,
	})

	// Safe standard library subset only.
	lua.OpenBase(l)
	lua.OpenString(l)
	lua.OpenTable(l)
	lua.OpenMath(l)

	// Remove filesystem-capable functions exposed by the base library.
	l.SetGlobal("dofile", lua.LNil)
	l.SetGlobal("loadfile", lua.LNil)

	p := &luautils.Processor{}
	luautils.RegisterEncodingModule(p, l)
	luautils.RegisterUtilsModule(l)
	// Wire up context cancellation so the Lua VM respects the deadline.
	l.SetContext(ctx)

	return l
}

// extractOutput retrieves the output value from the Lua state.
// It converts the global `output` table to a JSON string, recursively
// sanitising all nested tables so they are safe for json.Marshal.
func extractOutput(l *lua.LState) (string, error) {
	outputVal := l.GetGlobal("output")
	sanitized := luautils.SanitizeValue(luautils.ToGoValue(outputVal))

	b, err := json.Marshal(sanitized)
	if err != nil {
		return "", fmt.Errorf("failed to marshal lua output to JSON: %w", err)
	}

	return string(b), nil
}
