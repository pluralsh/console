package client

import (
	"encoding/json"
	"fmt"
	"reflect"
	"strings"
)

// Generated inputs omit nil and empty fields, and Console keeps the stored value of omitted fields.
// Monitor and dashboard inputs describe the full desired state, so they send every field instead:
// nil pointers as null and nil lists as [] (Console rejects null for embedded lists).

// MarshalJSON sends all fields of the monitor attributes, see above.
func (in MonitorAttributes) MarshalJSON() ([]byte, error) {
	return marshalFullInput(reflect.ValueOf(in))
}

// MarshalJSON sends all fields of the dashboard attributes, see above.
func (in DashboardAttributes) MarshalJSON() ([]byte, error) {
	return marshalFullInput(reflect.ValueOf(in))
}

// marshalFullInput encodes a value without omitting fields. It walks structs directly,
// ignoring their MarshalJSON methods, which prevents infinite recursion.
func marshalFullInput(v reflect.Value) ([]byte, error) {
	switch v.Kind() {
	case reflect.Invalid:
		return []byte("null"), nil
	case reflect.Pointer, reflect.Interface:
		if v.IsNil() {
			return []byte("null"), nil
		}
		return marshalFullInput(v.Elem())
	case reflect.Slice, reflect.Array:
		items := make([]json.RawMessage, 0, v.Len())
		for i := range v.Len() {
			item, err := marshalFullInput(v.Index(i))
			if err != nil {
				return nil, err
			}
			items = append(items, item)
		}
		return json.Marshal(items)
	case reflect.Struct:
		t := v.Type()
		fields := make(map[string]json.RawMessage, t.NumField())
		for i := range t.NumField() {
			field := t.Field(i)
			if !field.IsExported() {
				continue
			}

			name := jsonFieldName(field)
			if name == "-" {
				continue
			}

			value, err := marshalFullInput(v.Field(i))
			if err != nil {
				return nil, fmt.Errorf("failed to encode %s.%s: %w", t.Name(), field.Name, err)
			}
			fields[name] = value
		}
		return json.Marshal(fields)
	default:
		// Scalars and enums (enums implement json.Marshaler).
		return json.Marshal(v.Interface())
	}
}

func jsonFieldName(field reflect.StructField) string {
	name, _, _ := strings.Cut(field.Tag.Get("json"), ",")
	if name == "" {
		return field.Name
	}
	return name
}
