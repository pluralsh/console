package python

import (
	"context"
	"fmt"
	"sync"

	monty "github.com/ewhauser/gomonty"
)

// ObjectMetaLookup returns cached Kubernetes object metadata for Helm Python
// scripts. A nil map means the object is not in the cache.
type ObjectMetaLookup func(group, version, kind, namespace, name string) (map[string]any, error)

var objectMetaLookup struct {
	sync.RWMutex
	fn ObjectMetaLookup
}

// SetObjectMetaLookup installs the process-wide cache lookup used by
// k8s_object_meta. Pass nil to clear it.
func SetObjectMetaLookup(fn ObjectMetaLookup) {
	objectMetaLookup.Lock()
	objectMetaLookup.fn = fn
	objectMetaLookup.Unlock()
}

func (p *Pool) feedOptions() monty.FeedOptions {
	return monty.FeedOptions{
		Functions: map[string]monty.ExternalFunction{
			"k8s_object_meta": k8sObjectMeta,
		},
	}
}

func k8sObjectMeta(_ context.Context, call monty.Call) (monty.Result, error) {
	if len(call.Args) != 5 {
		return raise("TypeError", "k8s_object_meta() takes 5 string arguments")
	}

	group, err := stringArg(call.Args, 0)
	if err != nil {
		return raise("TypeError", err.Error())
	}
	version, err := stringArg(call.Args, 1)
	if err != nil {
		return raise("TypeError", err.Error())
	}
	kind, err := stringArg(call.Args, 2)
	if err != nil {
		return raise("TypeError", err.Error())
	}
	namespace, err := stringArg(call.Args, 3)
	if err != nil {
		return raise("TypeError", err.Error())
	}
	name, err := stringArg(call.Args, 4)
	if err != nil {
		return raise("TypeError", err.Error())
	}

	objectMetaLookup.RLock()
	fn := objectMetaLookup.fn
	objectMetaLookup.RUnlock()
	if fn == nil {
		return monty.Return(monty.None()), nil
	}

	meta, err := fn(group, version, kind, namespace, name)
	if err != nil {
		return raise("RuntimeError", err.Error())
	}
	if meta == nil {
		return monty.Return(monty.None()), nil
	}

	return monty.Return(goMapToValue(meta)), nil
}

func stringArg(args []monty.Value, index int) (string, error) {
	raw := args[index].Raw()
	if raw == nil {
		return "", nil
	}
	value, ok := raw.(string)
	if !ok {
		return "", fmt.Errorf("k8s_object_meta() argument %d must be a string", index+1)
	}
	return value, nil
}

func raise(kind, message string) (monty.Result, error) {
	return monty.Raise(monty.Exception{Type: kind, Arg: &message}), nil
}

func goMapToValue(value any) monty.Value {
	switch typed := value.(type) {
	case nil:
		return monty.None()
	case string:
		return monty.String(typed)
	case map[string]string:
		items := make(monty.Dict, 0, len(typed))
		for key, item := range typed {
			items = append(items, monty.Pair{Key: monty.String(key), Value: monty.String(item)})
		}
		return monty.DictValue(items)
	case map[string]any:
		items := make(monty.Dict, 0, len(typed))
		for key, item := range typed {
			items = append(items, monty.Pair{Key: monty.String(key), Value: goMapToValue(item)})
		}
		return monty.DictValue(items)
	default:
		return monty.None()
	}
}
