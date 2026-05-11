package common

import (
	"sync"

	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"

	"github.com/pluralsh/deployment-operator/pkg/lua"
)

func init() {
	luaScript = &LuaScript{}
}

var luaScript *LuaScript

// LuaScript is a thread-safe structure for string manipulation
type LuaScript struct {
	mu    sync.RWMutex
	value string
}

func GetLuaScript() *LuaScript {
	return luaScript
}

// SetValue sets the value of the string in a thread-safe manner
func (s *LuaScript) SetValue(val string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.value = val
}

// GetValue retrieves the value of the string in a thread-safe manner
func (s *LuaScript) GetValue() string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.value
}

func (s *LuaScript) IsLuaScriptValue() bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.value != ""
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
