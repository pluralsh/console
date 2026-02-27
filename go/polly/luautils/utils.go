package luautils

import (
	"path/filepath"
	"strings"

	"dario.cat/mergo"
	lua "github.com/yuin/gopher-lua"
)

// RegisterUtilsModule registers the utils module functions
func RegisterUtilsModule(L *lua.LState) {
	mod := L.RegisterModule("utils", map[string]lua.LGFunction{
		"merge":       merge,
		"splitString": splitString,
		"pathJoin":    pathJoin,
	})
	L.Push(mod)
}

func pathJoin(L *lua.LState) int {
	parts := L.CheckTable(1)

	converted := ToGoValue(parts).([]interface{})
	res := make([]string, 0, len(converted))
	for _, part := range converted {
		res = append(res, part.(string))
	}

	joined := filepath.Join(res...)
	L.Push(GoValueToLuaValue(L, joined))
	return 1
}

func splitString(L *lua.LState) int {
	str := L.CheckString(1)
	delim := L.CheckString(2)

	parts := strings.Split(str, delim)
	L.Push(GoValueToLuaValue(L, parts))
	return 1
}

func merge(L *lua.LState) int {
	dst := L.CheckTable(1) // Get the destination (first argument)
	src := L.CheckTable(2) // Get the source (second argument)
	override := L.OptString(3, "override")

	opts := []func(*mergo.Config){mergo.WithOverride}
	if override == "append" {
		opts = append(opts, mergo.WithAppendSlice)
	}

	// Convert Lua tables to Go maps
	dstMap := map[interface{}]interface{}{}
	if override == "append" {
		dest := ToGoValueWithoutEmptyTables(dst)
		if dest != nil {
			dstMap = dest.(map[interface{}]interface{})
		}
	} else {
		dstMap = ToGoValue(dst).(map[interface{}]interface{})
	}

	srcMap := ToGoValue(src).(map[interface{}]interface{})

	// Perform deep merge using mergo
	err := mergo.Merge(&dstMap, srcMap, opts...)
	if err != nil {
		L.Push(lua.LNil)
		L.Push(lua.LString(err.Error()))
		return 2
	}

	// Convert back to Lua table and return
	L.Push(GoValueToLuaValue(L, SanitizeValue(dstMap)))
	return 1
}
