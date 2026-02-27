package luautils_test

import (
	"testing"

	"github.com/pluralsh/polly/luautils"
	"github.com/stretchr/testify/assert"
	lua "github.com/yuin/gopher-lua"
)

func TestGoValueToLuaValue_Primitives(t *testing.T) {
	L := luautils.NewLuaState(".")
	defer L.Close()

	assert.Equal(t, lua.LString("hello"), luautils.GoValueToLuaValue(L, "hello"))
	assert.Equal(t, lua.LNumber(123), luautils.GoValueToLuaValue(L, 123))
	assert.Equal(t, lua.LNumber(1.5), luautils.GoValueToLuaValue(L, 1.5))
	assert.Equal(t, lua.LBool(true), luautils.GoValueToLuaValue(L, true))
}

func TestGoValueToLuaValue_Slice(t *testing.T) {
	L := luautils.NewLuaState(".")
	defer L.Close()

	val := luautils.GoValueToLuaValue(L, []int{1, 2, 3})
	tbl, ok := val.(*lua.LTable)
	assert.True(t, ok)
	assert.Equal(t, lua.LNumber(1), tbl.RawGetInt(1))
	assert.Equal(t, lua.LNumber(2), tbl.RawGetInt(2))
	assert.Equal(t, lua.LNumber(3), tbl.RawGetInt(3))
}

func TestGoValueToLuaValue_Map(t *testing.T) {
	L := luautils.NewLuaState(".")
	defer L.Close()

	val := luautils.GoValueToLuaValue(L, map[string]string{"foo": "bar"})
	tbl, ok := val.(*lua.LTable)
	assert.True(t, ok)
	assert.Equal(t, lua.LString("bar"), tbl.RawGetString("foo"))
}

func TestGoValueToLuaValue_Struct(t *testing.T) {
	type TestStruct struct {
		Name  string
		Count int
	}
	L := luautils.NewLuaState(".")
	defer L.Close()

	val := luautils.GoValueToLuaValue(L, TestStruct{Name: "hello", Count: 42})
	tbl, ok := val.(*lua.LTable)
	assert.True(t, ok)
	assert.Equal(t, lua.LString("hello"), tbl.RawGetString("Name"))
	assert.Equal(t, lua.LNumber(42), tbl.RawGetString("Count"))
}

func TestGoValueToLuaValue_TypedNil(t *testing.T) {
	L := luautils.NewLuaState(".")
	defer L.Close()

	var m map[string]string = nil
	var s []string = nil
	var p *int = nil

	assert.Equal(t, lua.LNil, luautils.GoValueToLuaValue(L, m))
	assert.Equal(t, lua.LNil, luautils.GoValueToLuaValue(L, s))
	assert.Equal(t, lua.LNil, luautils.GoValueToLuaValue(L, p))
	assert.Equal(t, lua.LNil, luautils.GoValueToLuaValue(L, nil))
}

func TestGoValueToLuaValue_PointerDereference(t *testing.T) {
	x := 99
	L := luautils.NewLuaState(".")
	defer L.Close()

	val := luautils.GoValueToLuaValue(L, &x)
	assert.Equal(t, lua.LNumber(99), val)
}

func TestGoValueToLuaValue_MapStringInterface(t *testing.T) {
	L := luautils.NewLuaState(".")
	defer L.Close()

	data := map[string]interface{}{
		"str":  "hello",
		"num":  123,
		"bool": true,
		"nested": map[string]interface{}{
			"inner": "value",
		},
		"list": []interface{}{1, "two", false},
	}

	val := luautils.GoValueToLuaValue(L, data)
	tbl, ok := val.(*lua.LTable)
	assert.True(t, ok)

	assert.Equal(t, lua.LString("hello"), tbl.RawGetString("str"))
	assert.Equal(t, lua.LNumber(123), tbl.RawGetString("num"))
	assert.Equal(t, lua.LBool(true), tbl.RawGetString("bool"))

	nested := tbl.RawGetString("nested")
	nestedTbl, ok := nested.(*lua.LTable)
	assert.True(t, ok)
	assert.Equal(t, lua.LString("value"), nestedTbl.RawGetString("inner"))

	list := tbl.RawGetString("list")
	listTbl, ok := list.(*lua.LTable)
	assert.True(t, ok)
	assert.Equal(t, lua.LNumber(1), listTbl.RawGetInt(1))
	assert.Equal(t, lua.LString("two"), listTbl.RawGetInt(2))
	assert.Equal(t, lua.LBool(false), listTbl.RawGetInt(3))
}
