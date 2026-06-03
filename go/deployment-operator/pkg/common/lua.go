package common

import (
	cmap "github.com/orcaman/concurrent-map/v2"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"

	"github.com/pluralsh/console/go/deployment-operator/pkg/lua"
)

var luaScripts = cmap.NewStringer[schema.GroupVersionKind, string]()

// SetLuaScriptForGVK sets the Lua script for a specific GVK in a thread-safe manner.
func SetLuaScriptForGVK(gvk schema.GroupVersionKind, val string) {
	luaScripts.Set(gvk, val)
}

// GetLuaScriptForGVK retrieves the Lua script for a given GVK.
// If there is no exact match, it falls back to the default (zero-value) GVK script.
func GetLuaScriptForGVK(gvk schema.GroupVersionKind) string {
	if val, ok := luaScripts.Get(gvk); ok {
		return val
	}

	return ""
}

func IsLuaScriptValueForGVK(gvk schema.GroupVersionKind) bool {
	_, ok := luaScripts.Get(gvk)
	return ok
}

// ClearLuaScripts clears all Lua scripts from the store in a thread-safe manner.
// Useful for testing to avoid cross-test contamination.
func ClearLuaScripts() {
	luaScripts.Clear()
}

func GetLuaHealthConvert(obj *unstructured.Unstructured, luaScript string) (*HealthStatus, error) {
	out, err := lua.ExecuteLua(obj.Object, luaScript)
	if err != nil {
		return nil, err
	}
	healthStatus := &HealthStatus{}
	if err := runtime.DefaultUnstructuredConverter.FromUnstructured(out, healthStatus); err != nil {
		return nil, err
	}
	if healthStatus.Status == "" && healthStatus.Message == "" {
		return nil, nil
	}
	return healthStatus, nil
}
