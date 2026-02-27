package luautils

import (
	"errors"
	"fmt"
	"reflect"

	"github.com/mitchellh/mapstructure"
	lua "github.com/yuin/gopher-lua"
)

// Mapper maps a lua table to a Go struct pointer.
type Mapper struct {
}

// MapLua maps the lua table to the given struct pointer with default options.
func MapLua(tbl *lua.LTable, st interface{}) error {
	return NewMapper().Map(tbl, st)
}

// NewMapper returns a new mapper.
func NewMapper() *Mapper {

	return &Mapper{}
}

// Map maps the lua table to the given struct pointer.
func (mapper *Mapper) Map(tbl *lua.LTable, st interface{}) error {
	goValue := ToGoValue(tbl)

	stVal := reflect.ValueOf(st)
	if stVal.Kind() != reflect.Ptr || stVal.IsNil() {
		return errors.New("st must be a non-nil pointer")
	}

	stElem := stVal.Elem()
	stKind := stElem.Kind()

	var config = &mapstructure.DecoderConfig{
		Result: st,
	}

	decoder, err := mapstructure.NewDecoder(config)
	if err != nil {
		return err
	}

	switch v := goValue.(type) {
	case map[interface{}]interface{}:
		if stKind != reflect.Struct && stKind != reflect.Map {
			stElem.Set(reflect.Zero(stElem.Type()))
			return nil
		}
		return decoder.Decode(v)
	case []interface{}:
		if stKind != reflect.Slice && stKind != reflect.Array {
			stElem.Set(reflect.Zero(stElem.Type()))
			return nil
		}
		return decoder.Decode(v)
	case nil:
		return nil
	default:
		return errors.New("unsupported table format: expected map or array")
	}
}

// ToGoValue converts the given LValue to a Go object.
func ToGoValue(lv lua.LValue) any {
	switch v := lv.(type) {
	case *lua.LNilType:
		return nil
	case lua.LBool:
		return bool(v)
	case lua.LString:
		return string(v)
	case lua.LNumber:
		return float64(v)
	case *lua.LTable:
		maxn := v.MaxN()
		if maxn == 0 { // table (or empty array)
			ret := make(map[any]any)
			v.ForEach(func(key, value lua.LValue) {
				ret[fmt.Sprint(ToGoValue(key))] = ToGoValue(value)
			})
			return ret
		} else { // array (with elements)
			ret := make([]any, 0, maxn)
			v.ForEach(func(key, value lua.LValue) {
				ret = append(ret, ToGoValue(value))
			})
			return ret
		}
	default:
		return v
	}
}

// ToGoValueWithoutEmptyTables converts the given LValue to a Go object.
// It returns nil for empty tables or arrays, instead of an empty map or slice.
func ToGoValueWithoutEmptyTables(lv lua.LValue) any {
	switch v := lv.(type) {
	case *lua.LNilType:
		return nil
	case lua.LBool:
		return bool(v)
	case lua.LString:
		return string(v)
	case lua.LNumber:
		return float64(v)
	case *lua.LTable:
		maxn := v.MaxN()
		if maxn == 0 { // table (or empty array)
			ret := make(map[any]any)
			v.ForEach(func(key, value lua.LValue) {
				ret[fmt.Sprint(ToGoValueWithoutEmptyTables(key))] = ToGoValueWithoutEmptyTables(value)
			})

			// Handles edge case where the table/array was defined as empty {} in Lua script.
			// In that case we return nil instead of empty map/slice as the type is not known.
			if len(ret) == 0 {
				return nil
			}

			return ret
		} else { // array (with elements)
			ret := make([]any, 0, maxn)
			v.ForEach(func(key, value lua.LValue) {
				ret = append(ret, ToGoValueWithoutEmptyTables(value))
			})
			return ret
		}
	default:
		return v
	}
}

// GoValueToLuaValue converts a Go value to a Lua value
func GoValueToLuaValue(L *lua.LState, value interface{}) lua.LValue {
	if value == nil {
		return lua.LNil
	}

	rv := reflect.ValueOf(value)
	if !rv.IsValid() || (rv.Kind() == reflect.Ptr && rv.IsNil()) {
		return lua.LNil
	}

	// Handle pointer dereferencing
	for rv.Kind() == reflect.Ptr {
		if rv.IsNil() {
			return lua.LNil
		}
		rv = rv.Elem()
	}

	rt := rv.Type()

	switch rv.Kind() {
	case reflect.Map:
		if rv.IsNil() {
			return lua.LNil
		}
		table := L.NewTable()
		for _, key := range rv.MapKeys() {
			keyStr := fmt.Sprint(key.Interface())
			val := rv.MapIndex(key).Interface()
			L.RawSet(table, lua.LString(keyStr), GoValueToLuaValue(L, val))
		}
		return table

	case reflect.Slice, reflect.Array:
		if rv.IsNil() {
			return lua.LNil
		}
		table := L.NewTable()
		for i := 0; i < rv.Len(); i++ {
			L.RawSetInt(table, i+1, GoValueToLuaValue(L, rv.Index(i).Interface()))
		}
		return table

	case reflect.Struct:
		table := L.NewTable()
		for i := 0; i < rt.NumField(); i++ {
			field := rt.Field(i)
			if field.PkgPath != "" { // skip unexported
				continue
			}
			fieldVal := rv.Field(i).Interface()
			L.RawSet(table, lua.LString(field.Name), GoValueToLuaValue(L, fieldVal))
		}
		return table
	}

	// Handle primitive types
	switch v := rv.Interface().(type) {
	case bool:
		return lua.LBool(v)
	case string:
		return lua.LString(v)
	case int, int8, int16, int32, int64:
		return lua.LNumber(reflect.ValueOf(v).Int())
	case uint, uint8, uint16, uint32, uint64:
		return lua.LNumber(reflect.ValueOf(v).Uint())
	case float32, float64:
		return lua.LNumber(reflect.ValueOf(v).Float())
	case fmt.Stringer:
		return lua.LString(v.String())
	}

	// Fallback: convert to string
	return lua.LString(fmt.Sprintf("%v", rv.Interface()))
}
