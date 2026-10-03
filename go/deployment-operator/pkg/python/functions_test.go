package python

import (
	"context"
	"reflect"
	"strings"
	"testing"
)

func TestRunYAMLEncodeDecode(t *testing.T) {
	p := testPool(t, Config{WorkerCount: 1, QueueSize: 1})

	result, err := p.Run(context.Background(), `
doc = yaml_decode("""
user:
  name: Charlie
  active: true
  roles: [admin, user]
  port: 8080
  ratio: 0.5
  nothing: null
""")
values["user"] = doc["user"]
values["encoded"] = yaml_encode({"b": [1, (2, 3)], "a": {"enabled": True, "name": "x"}, "c": None})
values["roundTrip"] = yaml_decode(yaml_encode(doc)) == doc
values["scalar"] = yaml_decode("42")
values["empty"] = yaml_decode("") is None
values["keys"] = list(yaml_decode("z: 1\na: 2\nm: 3").keys())
values["dates"] = yaml_decode("day: 2024-01-01\nat: 2024-01-01T10:00:00Z\nquoted: '2024-01-01'")
`, nil)
	if err != nil {
		t.Fatalf("Run: %v", err)
	}

	user := map[string]any{
		"name":    "Charlie",
		"active":  true,
		"roles":   []any{"admin", "user"},
		"port":    float64(8080),
		"ratio":   0.5,
		"nothing": nil,
	}
	if !reflect.DeepEqual(result.Values["user"], user) {
		t.Fatalf("unexpected decoded user: %#v", result.Values["user"])
	}
	encoded := "a:\n    enabled: true\n    name: x\nb:\n    - 1\n    - - 2\n      - 3\nc: null\n"
	if result.Values["encoded"] != encoded {
		t.Fatalf("unexpected encoded YAML: %q", result.Values["encoded"])
	}
	if result.Values["roundTrip"] != true || result.Values["scalar"] != float64(42) || result.Values["empty"] != true {
		t.Fatalf("unexpected results: %#v", result.Values)
	}
	if !reflect.DeepEqual(result.Values["keys"], []any{"a", "m", "z"}) {
		t.Fatalf("decoded keys are not sorted: %#v", result.Values["keys"])
	}
	dates := map[string]any{"day": "2024-01-01", "at": "2024-01-01T10:00:00Z", "quoted": "2024-01-01"}
	if !reflect.DeepEqual(result.Values["dates"], dates) {
		t.Fatalf("timestamps were not kept as text: %#v", result.Values["dates"])
	}
}

func TestRunMerge(t *testing.T) {
	p := testPool(t, Config{WorkerCount: 1, QueueSize: 1})

	result, err := p.Run(context.Background(), `
base = {"server": {"host": "localhost", "port": 8080, "ssl": {"enabled": False}}, "features": ["auth", "logging"]}
override = {"server": {"host": "0.0.0.0", "ssl": {"enabled": True, "cert": "prod.crt"}}, "features": ["metrics"]}
values["override"] = merge(base, override)
values["append"] = merge(base, override, "append")
values["appendKwarg"] = merge(base, override, strategy="append")
values["baseUnchanged"] = base["server"]["host"] == "localhost" and len(base["features"]) == 2
`, nil)
	if err != nil {
		t.Fatalf("Run: %v", err)
	}

	server := map[string]any{
		"host": "0.0.0.0",
		"port": float64(8080),
		"ssl":  map[string]any{"enabled": true, "cert": "prod.crt"},
	}
	overridden := map[string]any{"server": server, "features": []any{"metrics"}}
	if !reflect.DeepEqual(result.Values["override"], overridden) {
		t.Fatalf("unexpected override merge: %#v", result.Values["override"])
	}
	appended := map[string]any{"server": server, "features": []any{"auth", "logging", "metrics"}}
	if !reflect.DeepEqual(result.Values["append"], appended) || !reflect.DeepEqual(result.Values["appendKwarg"], appended) {
		t.Fatalf("unexpected append merge: %#v / %#v", result.Values["append"], result.Values["appendKwarg"])
	}
	if result.Values["baseUnchanged"] != true {
		t.Fatalf("merge mutated its destination: %#v", result.Values)
	}

	result, err = p.Run(context.Background(), `values["mixed"] = merge({"a": [1]}, {"a": {"b": 1}}, "append")`, nil)
	if err != nil {
		t.Fatalf("mixed-type merge: %v", err)
	}
	if mixed := map[string]any{"a": map[string]any{"b": float64(1)}}; !reflect.DeepEqual(result.Values["mixed"], mixed) {
		t.Fatalf("expected the source dict to replace the list, got %#v", result.Values["mixed"])
	}
}

func TestRunFunctionArgumentErrors(t *testing.T) {
	p := testPool(t, Config{WorkerCount: 1, QueueSize: 1})

	for script, kind := range map[string]string{
		`yaml_encode()`:                          "TypeError",
		`yaml_encode(k8s_object_meta)`:           "TypeError",
		`yaml_decode(1)`:                         "TypeError",
		`yaml_decode("a: [")`:                    "ValueError",
		`merge({}, [])`:                          "TypeError",
		`merge({})`:                              "TypeError",
		`merge({}, {}, "replace")`:               "ValueError",
		`merge({}, {}, mode="append")`:           "TypeError",
		`merge({"a": {}}, {"a": [1]}, "append")`: "ValueError",
	} {
		_, err := p.Run(context.Background(), script, nil)
		if err == nil || !strings.Contains(err.Error(), "python "+kind) {
			t.Errorf("%s: expected %s, got %v", script, kind, err)
		}
	}

	result, err := p.Run(context.Background(), `
try:
    yaml_decode("a: [")
except ValueError:
    values["caught"] = True
`, nil)
	if err != nil || result.Values["caught"] != true {
		t.Fatalf("expected a catchable ValueError, got %v / %#v", err, result.Values)
	}
}
