package python

import (
	"context"
	"fmt"

	"dario.cat/mergo"
	monty "github.com/ewhauser/gomonty"
	"gopkg.in/yaml.v3"
)

const (
	mergeStrategyOverride = "override"
	mergeStrategyAppend   = "append"
)

func (p *Pool) feedOptions() monty.FeedOptions {
	return monty.FeedOptions{
		Functions: map[string]monty.ExternalFunction{
			"k8s_object_meta": k8sObjectMeta,
			"yaml_encode":     yamlEncode,
			"yaml_decode":     yamlDecode,
			"merge":           merge,
		},
	}
}

// yamlEncode implements yaml_encode(value) -> str.
func yamlEncode(_ context.Context, call monty.Call) (monty.Result, error) {
	if len(call.Args) != 1 || len(call.Kwargs) != 0 {
		return raise("TypeError", "yaml_encode() takes exactly 1 argument")
	}
	value, err := valueToGo(call.Args[0])
	if err != nil {
		return raise("TypeError", fmt.Sprintf("yaml_encode(): %s", err))
	}
	encoded, err := yaml.Marshal(value)
	if err != nil {
		return raise("ValueError", fmt.Sprintf("yaml_encode(): %s", err))
	}
	return monty.Return(monty.String(string(encoded))), nil
}

// yamlDecode implements yaml_decode(text) -> value.
func yamlDecode(_ context.Context, call monty.Call) (monty.Result, error) {
	if len(call.Args) != 1 || len(call.Kwargs) != 0 {
		return raise("TypeError", "yaml_decode() takes exactly 1 argument")
	}
	text, ok := call.Args[0].Raw().(string)
	if !ok {
		return raise("TypeError", "yaml_decode() argument must be a string")
	}
	var document yaml.Node
	if err := yaml.Unmarshal([]byte(text), &document); err != nil {
		return raise("ValueError", fmt.Sprintf("yaml_decode(): %s", err))
	}
	keepTimestampsAsText(&document)

	var decoded any
	if err := document.Decode(&decoded); err != nil {
		return raise("ValueError", fmt.Sprintf("yaml_decode(): %s", err))
	}
	return monty.Return(goToValue(decoded)), nil
}

// keepTimestampsAsText stops implicit YAML timestamps from being normalized,
// so "2024-01-01" stays a date string instead of becoming a full RFC 3339 time.
func keepTimestampsAsText(node *yaml.Node) {
	if node.Kind == yaml.ScalarNode && node.ShortTag() == "!!timestamp" {
		node.Tag = "!!str"
	}
	for _, child := range node.Content {
		keepTimestampsAsText(child)
	}
}

// merge implements merge(destination, source, strategy="override") -> dict,
// mirroring the Lua utils.merge helper. Neither argument is modified.
func merge(_ context.Context, call monty.Call) (monty.Result, error) {
	strategy := mergeStrategyOverride
	args := call.Args
	for _, pair := range call.Kwargs {
		if key, _ := pair.Key.Raw().(string); key != "strategy" {
			return raise("TypeError", fmt.Sprintf("merge() got an unexpected keyword argument %q", key))
		}
		args = append(args, pair.Value)
	}
	if len(args) < 2 || len(args) > 3 {
		return raise("TypeError", "merge() takes 2 or 3 arguments")
	}
	if len(args) == 3 {
		value, ok := args[2].Raw().(string)
		if !ok || (value != mergeStrategyOverride && value != mergeStrategyAppend) {
			return raise("ValueError", `merge() strategy must be "override" or "append"`)
		}
		strategy = value
	}

	destination, err := dictArg(args[0], "destination")
	if err != nil {
		return raise("TypeError", err.Error())
	}
	source, err := dictArg(args[1], "source")
	if err != nil {
		return raise("TypeError", err.Error())
	}

	options := []func(*mergo.Config){mergo.WithOverride}
	if strategy == mergeStrategyAppend {
		options = append(options, mergo.WithAppendSlice)
	}
	if err := mergo.Merge(&destination, source, options...); err != nil {
		return raise("ValueError", fmt.Sprintf("merge(): %s", err))
	}
	return monty.Return(goToValue(destination)), nil
}

func dictArg(value monty.Value, name string) (map[string]any, error) {
	if _, ok := value.Raw().(monty.Dict); !ok {
		return nil, fmt.Errorf("merge() %s must be a dict", name)
	}
	converted, err := valueToGo(value)
	if err != nil {
		return nil, fmt.Errorf("merge() %s: %w", name, err)
	}
	return converted.(map[string]any), nil
}
