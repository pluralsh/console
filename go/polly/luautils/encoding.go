package luautils

import (
	"fmt"
	"os"
	"strings"

	"github.com/xeipuuv/gojsonschema"

	lua "github.com/yuin/gopher-lua"
	"gopkg.in/yaml.v3"
	"k8s.io/apimachinery/pkg/util/json"
)

// RegisterEncodingModule registers the encoding module functions
func RegisterEncodingModule(processor *Processor, L *lua.LState) {
	mod := L.RegisterModule("encoding", map[string]lua.LGFunction{
		"jsonEncode": jsonEncode,
		"jsonDecode": jsonDecode,
		"yamlEncode": yamlEncode,
		"yamlDecode": yamlDecode,
		"jsonSchema": processor.jsonSchema,
	})
	L.Push(mod)
}

// jsonSchema validates a Lua table against a JSON schema file.
// Usage: encoding.jsonSchema(struct, "path/to/schema.json")
func (p *Processor) jsonSchema(L *lua.LState) int {
	// Get arguments
	luaValue := L.CheckAny(1)      // Lua value to validate
	schemaPath := L.CheckString(2) // JSON schema file path

	// Validate and clean the path
	cleanPath, err := p.validatePath(schemaPath)
	if err != nil {
		L.Push(lua.LFalse)
		L.Push(lua.LString(err.Error()))
		return 2
	}

	// Read the JSON schema file
	schemaBytes, err := os.ReadFile(cleanPath)
	if err != nil {
		L.Push(lua.LFalse)
		L.Push(lua.LString(fmt.Sprintf("Failed to read schema file: %v", err)))
		return 2
	}

	// Parse the schema file
	schemaLoader := gojsonschema.NewBytesLoader(schemaBytes)

	// Convert Lua value to Go native value
	goValue := ToGoValue(luaValue)
	sanitized := SanitizeValue(goValue) // Sanitize nested structures
	// Marshal the value to JSON (required by gojsonschema)
	jsonBytes, err := json.Marshal(sanitized)
	if err != nil {
		L.Push(lua.LFalse)
		L.Push(lua.LString(fmt.Sprintf("Failed to marshal Lua value to JSON: %v", err)))
		return 2
	}
	documentLoader := gojsonschema.NewBytesLoader(jsonBytes)

	// Perform schema validation
	result, err := gojsonschema.Validate(schemaLoader, documentLoader)
	if err != nil {
		L.Push(lua.LFalse)
		L.Push(lua.LString(fmt.Sprintf("Schema validation error: %v", err)))
		return 2
	}

	// Check validation result
	if result.Valid() {
		L.Push(lua.LTrue)
		L.Push(lua.LNil)
	} else {
		L.Push(lua.LFalse)
		// Collect validation errors
		var errorMessages []string
		for _, validationError := range result.Errors() {
			errorMessages = append(errorMessages, validationError.String())
		}
		L.Push(lua.LString(strings.Join(errorMessages, "\n")))
	}
	return 2
}

func jsonEncode(L *lua.LState) int {
	value := L.CheckAny(1)
	goValue := ToGoValue(value)

	sanitized := SanitizeValue(goValue)

	jsonBytes, err := json.Marshal(sanitized)
	if err != nil {
		L.Push(lua.LNil)
		L.Push(lua.LString(err.Error()))
		return 2
	}

	L.Push(lua.LString(jsonBytes))
	return 1
}

func jsonDecode(L *lua.LState) int {
	jsonStr := L.CheckString(1)

	var goValue interface{}
	err := json.Unmarshal([]byte(jsonStr), &goValue)
	if err != nil {
		L.Push(lua.LNil)
		L.Push(lua.LString(err.Error()))
		return 2
	}

	L.Push(GoValueToLuaValue(L, goValue))
	return 1
}

func yamlEncode(L *lua.LState) int {
	value := L.CheckAny(1)
	goValue := ToGoValue(value)
	goValue = SanitizeValue(goValue)

	yamlBytes, err := yaml.Marshal(goValue)
	if err != nil {
		L.Push(lua.LNil)
		L.Push(lua.LString(err.Error()))
		return 2
	}

	L.Push(lua.LString(string(yamlBytes)))
	return 1
}

func yamlDecode(L *lua.LState) int {
	yamlStr := L.CheckString(1)

	var goValue interface{}
	err := yaml.Unmarshal([]byte(yamlStr), &goValue)
	if err != nil {
		L.Push(lua.LNil)
		L.Push(lua.LString(err.Error()))
		return 2
	}

	L.Push(GoValueToLuaValue(L, goValue))
	return 1
}

func SanitizeValue(val interface{}) interface{} {
	switch v := val.(type) {
	case map[interface{}]interface{}:
		m := make(map[string]interface{})
		for key, value := range v {
			strKey := fmt.Sprintf("%v", key) // Convert key to string
			m[strKey] = SanitizeValue(value)
		}
		return m
	case []interface{}:
		for i := range v {
			v[i] = SanitizeValue(v[i])
		}
		return v
	default:
		return v
	}
}
