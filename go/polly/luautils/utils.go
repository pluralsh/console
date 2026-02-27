package luautils

import (
	"path/filepath"
	"strings"

	"dario.cat/mergo"
	lua "github.com/yuin/gopher-lua"
)

// RegisterUtilsModule registers the utils module functions
func RegisterUtilsModule(l *lua.LState) {
	mod := l.RegisterModule("utils", map[string]lua.LGFunction{
		"merge":       merge,
		"splitString": splitString,
		"pathJoin":    pathJoin,
	})
	l.Push(mod)
}

func pathJoin(l *lua.LState) int {
	parts := l.CheckTable(1)

	converted := ToGoValue(parts).([]interface{})
	res := make([]string, 0, len(converted))
	for _, part := range converted {
		res = append(res, part.(string))
	}

	joined := filepath.Join(res...)
	l.Push(GoValueToLuaValue(l, joined))
	return 1
}

func splitString(l *lua.LState) int {
	str := l.CheckString(1)
	delim := l.CheckString(2)

	parts := strings.Split(str, delim)
	l.Push(GoValueToLuaValue(l, parts))
	return 1
}

func merge(l *lua.LState) int {
	dst := l.CheckTable(1) // Get the destination (first argument)
	src := l.CheckTable(2) // Get the source (second argument)
	override := l.OptString(3, "override")

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
		l.Push(lua.LNil)
		l.Push(lua.LString(err.Error()))
		return 2
	}

	// Convert back to Lua table and return
	l.Push(GoValueToLuaValue(l, SanitizeValue(dstMap)))
	return 1
}
