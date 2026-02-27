package luautils

import (
	lua "github.com/yuin/gopher-lua"
)

// Processor handles Lua script processing
type Processor struct {
	BasePath string
}

func NewLuaState(path string) *lua.LState {
	l := lua.NewState(lua.Options{
		SkipOpenLibs: true,
	})

	// Load only safe standard libraries
	lua.OpenBase(l)
	lua.OpenString(l)
	lua.OpenTable(l)
	lua.OpenMath(l)
	lua.OpenPackage(l)

	p := &Processor{BasePath: path}
	// Register custom modules
	RegisterEncodingModule(p, l)
	RegisterFSModule(p, l)
	RegisterUtilsModule(l)

	return l
}
