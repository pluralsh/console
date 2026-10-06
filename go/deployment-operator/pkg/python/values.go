package python

import (
	"fmt"
	"math"
	"math/big"
	"slices"
	"time"

	monty "github.com/ewhauser/gomonty"
	"github.com/pluralsh/console/go/polly/luautils"
)

// valueToGo converts a sandbox value into plain Go data (maps, slices, and
// scalars) suitable for YAML encoding and merging. Dictionary keys are
// stringified, matching how values are serialized back to Helm.
func valueToGo(value monty.Value) (any, error) {
	// Objects without a structured form (functions, modules, cycles) arrive as
	// repr strings and must not be mistaken for str values.
	if kind := value.Kind(); kind == "repr" || kind == "cycle" {
		return nil, fmt.Errorf("unsupported value of type %s", kind)
	}

	switch raw := value.Raw().(type) {
	case nil, bool, int64, float64, string:
		return raw, nil
	case *big.Int:
		if raw.IsInt64() {
			return raw.Int64(), nil
		}
		if raw.IsUint64() {
			return raw.Uint64(), nil
		}
		return raw.String(), nil
	case []monty.Value:
		return valuesToGo(raw)
	case monty.Tuple:
		return valuesToGo(raw)
	case monty.Set:
		return valuesToGo(raw)
	case monty.FrozenSet:
		return valuesToGo(raw)
	case monty.Dict:
		result := make(map[string]any, len(raw))
		for _, pair := range raw {
			key, err := valueToGo(pair.Key)
			if err != nil {
				return nil, err
			}
			item, err := valueToGo(pair.Value)
			if err != nil {
				return nil, err
			}
			if text, ok := key.(string); ok {
				result[text] = item
			} else {
				result[fmt.Sprintf("%v", key)] = item
			}
		}
		return result, nil
	case monty.Date:
		return fmt.Sprintf("%04d-%02d-%02d", raw.Year, raw.Month, raw.Day), nil
	default:
		return nil, fmt.Errorf("unsupported value of type %s", value.Kind())
	}
}

func valuesToGo(values []monty.Value) ([]any, error) {
	result := make([]any, 0, len(values))
	for _, item := range values {
		converted, err := valueToGo(item)
		if err != nil {
			return nil, err
		}
		result = append(result, converted)
	}
	return result, nil
}

// goToValue converts plain Go data into a sandbox value. Map keys are sorted
// so dictionary iteration order is deterministic across renders.
func goToValue(value any) monty.Value {
	switch typed := luautils.SanitizeValue(value).(type) {
	case nil:
		return monty.None()
	case bool:
		return monty.Bool(typed)
	case int:
		return monty.Int(int64(typed))
	case int64:
		return monty.Int(typed)
	case uint64:
		if typed > math.MaxInt64 {
			return monty.BigInt(new(big.Int).SetUint64(typed))
		}
		return monty.Int(int64(typed))
	case float64:
		return monty.Float(typed)
	case string:
		return monty.String(typed)
	case []byte:
		return monty.String(string(typed))
	case time.Time:
		return monty.String(typed.Format(time.RFC3339Nano))
	case []any:
		items := make([]monty.Value, 0, len(typed))
		for _, item := range typed {
			items = append(items, goToValue(item))
		}
		return monty.List(items...)
	case []string:
		items := make([]monty.Value, 0, len(typed))
		for _, item := range typed {
			items = append(items, monty.String(item))
		}
		return monty.List(items...)
	case map[string]string:
		items := make(monty.Dict, 0, len(typed))
		for _, key := range sortedKeys(typed) {
			items = append(items, monty.Pair{Key: monty.String(key), Value: monty.String(typed[key])})
		}
		return monty.DictValue(items)
	case map[string]any:
		items := make(monty.Dict, 0, len(typed))
		for _, key := range sortedKeys(typed) {
			items = append(items, monty.Pair{Key: monty.String(key), Value: goToValue(typed[key])})
		}
		return monty.DictValue(items)
	default:
		return monty.String(fmt.Sprintf("%v", typed))
	}
}

func sortedKeys[V any](m map[string]V) []string {
	keys := make([]string, 0, len(m))
	for key := range m {
		keys = append(keys, key)
	}
	slices.Sort(keys)
	return keys
}
