package lua

import (
	"fmt"

	"github.com/pluralsh/console/go/polly/luautils"
	"github.com/pluralsh/deployment-operator/internal/utils"
	lua "github.com/yuin/gopher-lua"
	"k8s.io/apimachinery/pkg/api/meta"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
)

func statusConditionExists(s map[string]interface{}, condition string) bool {
	conds, found, err := unstructured.NestedSlice(s, "conditions")
	if err != nil || !found {
		return false
	}
	conditions := utils.UnstructuredToConditions(conds)

	return meta.FindStatusCondition(conditions, condition) != nil
}

func isStatusConditionTrue(s map[string]interface{}, condition string) bool {
	conds, found, err := unstructured.NestedSlice(s, "conditions")
	if err != nil || !found {
		return false
	}
	conditions := utils.UnstructuredToConditions(conds)

	if meta.FindStatusCondition(conditions, condition) != nil {
		if meta.IsStatusConditionTrue(conditions, condition) {
			return true
		}
	}

	return false
}

func luaStatusConditionExists(l *lua.LState) int {
	tbl := l.CheckTable(1)
	cond := l.CheckString(2)

	// Convert table to Go value
	obj := luautils.ToGoValue(tbl)

	// Sanitize to ensure map[string]interface{}
	m, ok := obj.(map[string]interface{})
	if !ok {
		// Wrap slice or convert map[interface{}]interface{} recursively
		m = sanitizeValue(obj).(map[string]interface{})
	}

	l.Push(lua.LBool(statusConditionExists(m, cond)))
	return 1
}

func luaIsStatusConditionTrue(l *lua.LState) int {
	tbl := l.CheckTable(1)
	cond := l.CheckString(2)

	obj := luautils.ToGoValue(tbl)

	m, ok := obj.(map[string]interface{})
	if !ok {
		m = sanitizeValue(obj).(map[string]interface{})
	}

	l.Push(lua.LBool(isStatusConditionTrue(m, cond)))
	return 1
}

func sanitizeValue(val interface{}) interface{} {
	switch v := val.(type) {
	case map[interface{}]interface{}:
		m := make(map[string]interface{})
		for key, value := range v {
			strKey := fmt.Sprintf("%v", key) // Convert key to string
			m[strKey] = sanitizeValue(value)
		}
		return m
	case []interface{}:
		for i := range v {
			v[i] = sanitizeValue(v[i])
		}
		return v
	default:
		return v
	}
}
