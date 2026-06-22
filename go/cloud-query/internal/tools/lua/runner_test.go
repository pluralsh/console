package lua

import (
	"context"
	"encoding/json"
	"strings"
	"testing"
	"time"
)

func run(t *testing.T, script string) map[string]interface{} {
	t.Helper()
	out, err := Run(context.Background(), RunInput{Script: script})
	if err != nil {
		t.Fatalf("Run() error: %v", err)
	}
	var result map[string]interface{}
	if err := json.Unmarshal([]byte(out.ResultJSON), &result); err != nil {
		t.Fatalf("unmarshal result JSON %q: %v", out.ResultJSON, err)
	}
	return result
}

// TestOutputStringField verifies a simple string field written to output.
func TestOutputStringField(t *testing.T) {
	result := run(t, `output["name"] = "Alice"`)
	if result["name"] != "Alice" {
		t.Errorf("expected name=Alice, got %v", result["name"])
	}
}

// TestOutputMultipleFields verifies multiple typed fields.
func TestOutputMultipleFields(t *testing.T) {
	result := run(t, `
		output["str"]  = "hello"
		output["num"]  = 42
		output["bool"] = true
	`)
	if result["str"] != "hello" {
		t.Errorf("str: want hello, got %v", result["str"])
	}
	if result["num"] != float64(42) {
		t.Errorf("num: want 42, got %v", result["num"])
	}
	if result["bool"] != true {
		t.Errorf("bool: want true, got %v", result["bool"])
	}
}

// TestOutputNestedTable verifies nested table serialisation.
func TestOutputNestedTable(t *testing.T) {
	result := run(t, `
		output["user"] = { name = "Bob", age = 30 }
	`)
	user, ok := result["user"].(map[string]interface{})
	if !ok {
		t.Fatalf("user field is not a map: %T", result["user"])
	}
	if user["name"] != "Bob" {
		t.Errorf("user.name: want Bob, got %v", user["name"])
	}
	if user["age"] != float64(30) {
		t.Errorf("user.age: want 30, got %v", user["age"])
	}
}

// TestEncodingJSONRoundtrip verifies encoding.jsonEncode / encoding.jsonDecode.
func TestEncodingJSONRoundtrip(t *testing.T) {
	result := run(t, `
		local obj = { key = "value", count = 7 }
		local encoded = encoding.jsonEncode(obj)
		local decoded = encoding.jsonDecode(encoded)
		output["key"]   = decoded["key"]
		output["count"] = decoded["count"]
	`)
	if result["key"] != "value" {
		t.Errorf("key: want value, got %v", result["key"])
	}
	if result["count"] != float64(7) {
		t.Errorf("count: want 7, got %v", result["count"])
	}
}

// TestEncodingYAMLRoundtrip verifies encoding.yamlEncode / encoding.yamlDecode.
func TestEncodingYAMLRoundtrip(t *testing.T) {
	result := run(t, `
		local obj  = { city = "Paris", pop = 2161000 }
		local yml  = encoding.yamlEncode(obj)
		local back = encoding.yamlDecode(yml)
		output["city"] = back["city"]
		output["pop"]  = back["pop"]
	`)
	if result["city"] != "Paris" {
		t.Errorf("city: want Paris, got %v", result["city"])
	}
	if result["pop"] != float64(2161000) {
		t.Errorf("pop: want 2161000, got %v", result["pop"])
	}
}

// TestUtilsMerge verifies utils.merge combines two tables.
func TestUtilsMerge(t *testing.T) {
	result := run(t, `
		local a = { x = 1 }
		local b = { y = 2 }
		local m = utils.merge(a, b)
		output["x"] = m["x"]
		output["y"] = m["y"]
	`)
	if result["x"] != float64(1) {
		t.Errorf("x: want 1, got %v", result["x"])
	}
	if result["y"] != float64(2) {
		t.Errorf("y: want 2, got %v", result["y"])
	}
}

// TestUtilsSplitString verifies utils.splitString.
func TestUtilsSplitString(t *testing.T) {
	result := run(t, `
		local parts = utils.splitString("a,b,c", ",")
		output["first"]  = parts[1]
		output["second"] = parts[2]
		output["third"]  = parts[3]
	`)
	if result["first"] != "a" || result["second"] != "b" || result["third"] != "c" {
		t.Errorf("splitString: got %v", result)
	}
}

// TestSandboxNoOS verifies that the os library is not available.
func TestSandboxNoOS(t *testing.T) {
	_, err := Run(context.Background(), RunInput{
		Script: `os.exit(0)`,
	})
	if err == nil {
		t.Fatal("expected error when accessing os library, got nil")
	}
}

// TestSandboxNoIO verifies that the io library is not available.
func TestSandboxNoIO(t *testing.T) {
	_, err := Run(context.Background(), RunInput{
		Script: `io.open("/etc/passwd", "r")`,
	})
	if err == nil {
		t.Fatal("expected error when accessing io library, got nil")
	}
}

// TestSandboxNoFS verifies that the fs module is not available.
func TestSandboxNoFS(t *testing.T) {
	_, err := Run(context.Background(), RunInput{
		Script: `fs.read("/etc/passwd")`,
	})
	if err == nil {
		t.Fatal("expected error when accessing fs module, got nil")
	}
}

// TestSandboxNoRequire verifies that require cannot load arbitrary modules.
func TestSandboxNoRequire(t *testing.T) {
	_, err := Run(context.Background(), RunInput{
		Script: `require("os")`,
	})
	if err == nil {
		t.Fatal("expected error from require, got nil")
	}
}

// TestSyntaxError verifies that a Lua syntax error is surfaced.
func TestSyntaxError(t *testing.T) {
	_, err := Run(context.Background(), RunInput{
		Script: `this is not valid lua %%%`,
	})
	if err == nil {
		t.Fatal("expected syntax error, got nil")
	}
	if !strings.Contains(err.Error(), "lua execution error") {
		t.Errorf("unexpected error message: %v", err)
	}
}

// TestTimeout verifies that a script exceeding the deadline is cancelled.
func TestTimeout(t *testing.T) {
	_, err := Run(context.Background(), RunInput{
		Script:  `while true do end`,
		Timeout: 100 * time.Millisecond,
	})
	if err == nil {
		t.Fatal("expected timeout error, got nil")
	}
}

// TestEmptyOutputIsEmptyObject verifies that an unmodified output table
// marshals to an empty JSON object.
func TestEmptyOutputIsEmptyObject(t *testing.T) {
	out, err := Run(context.Background(), RunInput{Script: `-- no-op`})
	if err != nil {
		t.Fatalf("Run() error: %v", err)
	}
	if out.ResultJSON != "{}" {
		t.Errorf("expected {}, got %s", out.ResultJSON)
	}
}
