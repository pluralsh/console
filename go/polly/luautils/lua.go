package luautils

import (
	lua "github.com/yuin/gopher-lua"
)

// Processor handles Lua script processing
type Processor struct {
	BasePath string
}

func NewLuaState(path string) *lua.LState {
	L := lua.NewState(lua.Options{
		SkipOpenLibs: true,
	})

	// Load only safe standard libraries
	lua.OpenBase(L)
	lua.OpenString(L)
	lua.OpenTable(L)
	lua.OpenMath(L)
	lua.OpenPackage(L)

	p := &Processor{BasePath: path}
	// Register custom modules
	RegisterEncodingModule(p, L)
	RegisterFSModule(p, L)
	RegisterUtilsModule(L)

	return L
}
