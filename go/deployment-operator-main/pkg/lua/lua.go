package lua

import (
	"fmt"

	"github.com/pluralsh/console/go/polly/luautils"
	lua "github.com/yuin/gopher-lua"
)

func ExecuteLua(vals map[string]interface{}, tplate string) (map[string]interface{}, error) {
	L := lua.NewState()
	defer L.Close()

	// Expose Go map as global "Obj"
	L.SetGlobal("Obj", luautils.GoValueToLuaValue(L, vals))

	// Register helper functions as globals
	L.SetFuncs(L.G.Global, map[string]lua.LGFunction{
		"isStatusConditionTrue": luaIsStatusConditionTrue,
		"statusConditionExists": luaStatusConditionExists,
	})

	// Run the Lua script
	if err := L.DoString(tplate); err != nil {
		return nil, fmt.Errorf("lua execution error: %w", err)
	}

	// Retrieve global healthStatus
	hv := L.GetGlobal("healthStatus")
	tbl, ok := hv.(*lua.LTable)
	if !ok {
		return nil, fmt.Errorf("expected global 'healthStatus' to be a table, got %s", hv.Type())
	}

	var output map[string]interface{}
	if err := luautils.MapLua(tbl, &output); err != nil {
		return nil, fmt.Errorf("failed to map healthStatus: %w", err)
	}

	return output, nil
}
