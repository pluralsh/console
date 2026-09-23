package client

import (
	"encoding/json"
	"fmt"
	"reflect"
	"strings"
)

// Inputs of resources that are managed declaratively (e.g. by the Kubernetes operator) have to
// describe the full desired state on every create and update.
//
// Generated input structs use `omitempty` JSON tags, so nil pointers and empty lists are dropped
// from requests. The Console API only changes fields that are present in the request, which means
// that removing an optional field or emptying a list in the desired state would keep the previously
// stored value. It also breaks switching a monitor type, as the query for the previous type is kept
// and the update is rejected with "does not match monitor type".
//
// The MarshalJSON implementations below send every field instead, recursively:
//   - nil pointers are sent as null, which clears scalar and embedded object values,
//   - nil and empty lists are sent as [], which clears embedded lists (null is rejected for them).
//
// The clientv2 encoder uses json.Marshaler implementations, so this applies to the generated
// CreateMonitor, UpdateMonitor, CreateDashboard and UpdateDashboard requests.

// MarshalJSON implements json.Marshaler and sends all fields of the monitor attributes, see above.
func (in MonitorAttributes) MarshalJSON() ([]byte, error) {
	return marshalFullInput(reflect.ValueOf(in))
}

// MarshalJSON implements json.Marshaler and sends all fields of the dashboard attributes, see above.
func (in DashboardAttributes) MarshalJSON() ([]byte, error) {
	return marshalFullInput(reflect.ValueOf(in))
}

// marshalFullInput encodes a GraphQL input value without omitting any struct fields.
// Structs are always walked field by field, so their own json.Marshaler implementations
// are ignored, which also prevents infinite recursion for the types above.
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
