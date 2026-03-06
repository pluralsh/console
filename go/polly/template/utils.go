package template

import (
	"fmt"
	"reflect"
	"strings"
)

func slice(v any, indices ...int) (any, error) {
	if v == nil {
		return nil, fmt.Errorf("slice input can't be nil value")
	}

	rv := reflect.ValueOf(v)
	// Handle pointers
	if rv.Kind() == reflect.Ptr {
		if rv.IsNil() {
			return nil, fmt.Errorf("slice input can't be nil pointer")
		}
		rv = rv.Elem()
	}

	// Ensure we are working with a Slice, Array, or String
	if rv.Kind() != reflect.Slice && rv.Kind() != reflect.Array && rv.Kind() != reflect.String {
		return nil, fmt.Errorf("wrong slice type %T", v)
	}

	l := rv.Len()
	start := 0
	end := l

	if len(indices) > 0 {
		start = indices[0]
	}
	if len(indices) > 1 {
		end = indices[1]
	}

	// Your logic: Safe bounds checking
	if start < 0 {
		start = 0
	}
	if end < 0 {
		end = 0
	}
	if start > l {
		start = l
	}
	if end > l {
		end = l
	}
	if start > end {
		start = end
	}

	return rv.Slice(start, end).Interface(), nil
}

func indent(v string, spaces int) string {
	pad := strings.Repeat(" ", spaces)
	return pad + strings.ReplaceAll(v, "\n", "\n"+pad)
}

func nindent(v string, spaces int) string {
	return "\n" + indent(v, spaces)
}

func ternary(v bool, vt interface{}, vf interface{}) interface{} {
	if v {
		return vt
	}

	return vf
}

func dfault(v1, v2 interface{}) interface{} {
	if empty(v1) {
		return v2
	}

	return v1
}

func empty(given interface{}) bool {
	g := reflect.ValueOf(given)
	if !g.IsValid() {
		return true
	}

	// Basically adapted from text/template.isTrue
	switch g.Kind() {
	default:
		return g.IsNil()
	case reflect.Array, reflect.Slice, reflect.Map, reflect.String:
		return g.Len() == 0
	case reflect.Bool:
		return !g.Bool()
	case reflect.Complex64, reflect.Complex128:
		return g.Complex() == 0
	case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64:
		return g.Int() == 0
	case reflect.Uint, reflect.Uint8, reflect.Uint16, reflect.Uint32, reflect.Uint64, reflect.Uintptr:
		return g.Uint() == 0
	case reflect.Float32, reflect.Float64:
		return g.Float() == 0
	case reflect.Struct:
		return false
	}
}
