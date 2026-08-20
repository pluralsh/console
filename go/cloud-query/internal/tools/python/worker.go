package python

import (
	"context"
	"errors"
	"io"
	"strings"

	monty "github.com/ewhauser/gomonty"
)

// RunWorker serves the private parent protocol. cmd/main must call it when its
// first argument is python-worker, before initializing the normal service.
func RunWorker(in io.Reader, out io.Writer) error {
	for {
		var request protocolRequest
		if err := readFrame(in, &request); err != nil {
			if errors.Is(err, io.EOF) {
				return nil
			}
			return err
		}
		response := protocolResponse{Version: protocolVersion, Type: request.Type, ID: request.ID}
		if request.Version != protocolVersion || request.ID == "" {
			return errors.New("invalid protocol request")
		}
		switch request.Type {
		case requestHealth:
			if request.Script != "" || request.InputJSON != "" {
				return errors.New("invalid protocol request")
			}
			if err := healthCheck(); err != nil {
				response.Code, response.Message = errorFields(err)
			}
		case requestRun:
			if len(request.Script) == 0 || len(request.Script) > MaxSourceBytes || len(request.InputJSON) > MaxInputBytes {
				response.Code, response.Message = errorFields(invalid("invalid python request"))
				break
			}
			inputJSON, err := validateRunInput(request.InputJSON)
			if err != nil {
				response.Code, response.Message = errorFields(err)
				break
			}
			output, err := runMonty(request.Script, inputJSON)
			if err != nil {
				response.Code, response.Message = errorFields(err)
			} else {
				response.ResultJSON, response.Stdout = output.ResultJSON, output.Stdout
			}
		default:
			return errors.New("invalid protocol request")
		}
		if err := writeFrame(out, response); err != nil {
			return err
		}
	}
}

func healthCheck() error {
	_, err := monty.NewRepl(monty.ReplOptions{ScriptName: "workbench.py", Limits: montyLimits()})
	if err != nil {
		return runtimeFailure()
	}
	return nil
}

func runMonty(script, inputJSON string) (*RunOutput, error) {
	repl, err := monty.NewRepl(monty.ReplOptions{ScriptName: "workbench.py", Limits: montyLimits()})
	if err != nil {
		return nil, runtimeFailure()
	}
	ctx, cancel := context.WithTimeout(context.Background(), executionTimeout)
	defer cancel()
	if _, err := repl.FeedRun(ctx, "import json as __workbench_json\ninput = __workbench_json.loads("+pythonString(inputJSON)+")\noutput = {}", monty.FeedOptions{}); err != nil {
		return nil, montyError(err)
	}
	var stdout strings.Builder
	stdoutLimit := false
	print := func(stream, text string) {
		if stream != "stdout" {
			return
		}
		if stdout.Len()+len(text) > MaxStdoutBytes {
			stdoutLimit = true
			return
		}
		stdout.WriteString(text)
	}
	if _, err := repl.FeedRun(ctx, script, monty.FeedOptions{Print: print}); err != nil {
		return nil, montyError(err)
	}
	if stdoutLimit {
		return nil, &Error{Code: ResourceExhausted, Msg: "python stdout exceeds the stdout limit"}
	}
	value, err := repl.FeedRun(ctx, "__workbench_json.dumps(output)", monty.FeedOptions{})
	if err != nil {
		return nil, montyError(err)
	}
	result, ok := value.Raw().(string)
	if !ok {
		return nil, invalid("output must be a JSON object")
	}
	if len(result) > MaxResultBytes {
		return nil, &Error{Code: ResourceExhausted, Msg: "python result exceeds the result limit"}
	}
	if !isJSONObject(result) {
		return nil, invalid("output must be a JSON object")
	}
	return &RunOutput{ResultJSON: result, Stdout: stdout.String()}, nil
}

func montyLimits() *monty.ResourceLimits {
	return &monty.ResourceLimits{MaxDuration: executionTimeout, MaxMemory: maxMemoryBytes, MaxRecursionDepth: maxRecursionDepth}
}

func montyError(err error) error {
	if errors.Is(err, context.DeadlineExceeded) {
		return executionTimeoutError()
	}
	var syntax *monty.SyntaxError
	if errors.As(err, &syntax) {
		return invalid("python code is invalid")
	}
	var runtime *monty.RuntimeError
	if errors.As(err, &runtime) {
		kind, detail, ok := strings.Cut(strings.TrimSpace(runtime.Error()), ":")
		if !ok {
			kind, detail = "Exception", runtime.Error()
		}
		if kind == "ResourceError" {
			if strings.Contains(strings.ToLower(detail), "time") || strings.Contains(strings.ToLower(detail), "duration") {
				return executionTimeoutError()
			}
			return &Error{Code: ResourceExhausted, Msg: "python resource limit exceeded"}
		}
		return runtimeError(kind, detail)
	}
	return runtimeFailure()
}

func errorFields(err error) (Code, string) {
	var typed *Error
	if errors.As(err, &typed) {
		return typed.Code, typed.Msg
	}
	return Internal, "python runtime failed"
}
