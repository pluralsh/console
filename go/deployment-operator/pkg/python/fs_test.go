package python

import (
	"context"
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"testing"
)

func writeTestFile(t *testing.T, dir, name, content string) {
	t.Helper()
	path := filepath.Join(dir, name)
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		t.Fatalf("MkdirAll: %v", err)
	}
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}
}

func TestRunFSReadAndWalk(t *testing.T) {
	p := testPool(t, Config{WorkerCount: 1, QueueSize: 1})
	dir := t.TempDir()
	writeTestFile(t, dir, "config/base.yaml", "replicas: 2\n")
	writeTestFile(t, dir, "config/prod/override.yaml", "replicas: 5\n")
	writeTestFile(t, dir, "config/.hidden", "secret")
	writeTestFile(t, dir, "config/.git/HEAD", "ref")
	writeTestFile(t, dir, "top.txt", "top")

	result, err := p.RunInDir(context.Background(), dir, `
from pathlib import Path

values["path"] = fs.read(Path("config") / "base.yaml")
values["pathWalk"] = fs.walk(Path("config/prod"))
values["base"] = yaml_decode(fs.read("config/base.yaml"))
values["normalized"] = fs.read("./config/prod/../base.yaml")
values["all"] = fs.walk("config")
values["visible"] = fs.walk("config", True)
values["visibleKwarg"] = fs.walk("config", ignore_dotfiles=True)
values["root"] = fs.walk(".", True)
values["file"] = fs.walk("top.txt")

def load_all(folder):
    merged = {}
    for path in fs.walk(folder, True):
        merged = merge(merged, yaml_decode(fs.read(path)))
    return merged

values["merged"] = load_all("config")
`, nil)
	if err != nil {
		t.Fatalf("RunInDir: %v", err)
	}

	if !reflect.DeepEqual(result.Values["base"], map[string]any{"replicas": float64(2)}) {
		t.Fatalf("unexpected base: %#v", result.Values["base"])
	}
	if result.Values["path"] != "replicas: 2\n" || !reflect.DeepEqual(result.Values["pathWalk"], []any{"config/prod/override.yaml"}) {
		t.Fatalf("pathlib.Path arguments were not accepted: %#v / %#v", result.Values["path"], result.Values["pathWalk"])
	}
	if result.Values["normalized"] != "replicas: 2\n" {
		t.Fatalf("unexpected normalized read: %#v", result.Values["normalized"])
	}
	all := []any{"config/.git/HEAD", "config/.hidden", "config/base.yaml", "config/prod/override.yaml"}
	if !reflect.DeepEqual(result.Values["all"], all) {
		t.Fatalf("unexpected walk: %#v", result.Values["all"])
	}
	visible := []any{"config/base.yaml", "config/prod/override.yaml"}
	if !reflect.DeepEqual(result.Values["visible"], visible) || !reflect.DeepEqual(result.Values["visibleKwarg"], visible) {
		t.Fatalf("unexpected dotfile filtering: %#v / %#v", result.Values["visible"], result.Values["visibleKwarg"])
	}
	root := []any{"config/base.yaml", "config/prod/override.yaml", "top.txt"}
	if !reflect.DeepEqual(result.Values["root"], root) {
		t.Fatalf("unexpected root walk: %#v", result.Values["root"])
	}
	if !reflect.DeepEqual(result.Values["file"], []any{"top.txt"}) {
		t.Fatalf("unexpected file walk: %#v", result.Values["file"])
	}
	if !reflect.DeepEqual(result.Values["merged"], map[string]any{"replicas": float64(5)}) {
		t.Fatalf("unexpected merged config: %#v", result.Values["merged"])
	}
}

func TestRunFSIsScopedToDirectory(t *testing.T) {
	p := testPool(t, Config{WorkerCount: 1, QueueSize: 1})
	parent := t.TempDir()
	dir := filepath.Join(parent, "service")
	writeTestFile(t, dir, "inside.txt", "inside")
	writeTestFile(t, parent, "outside.txt", "outside")
	writeTestFile(t, parent, "outside/secret.txt", "secret")
	outside := filepath.Join(parent, "outside.txt")

	scripts := map[string]string{
		"parent traversal":       `fs.read("../outside.txt")`,
		"nested traversal":       `fs.read("a/../../outside.txt")`,
		"absolute path":          `fs.read(` + quote(outside) + `)`,
		"walk parent traversal":  `fs.walk("..")`,
		"walk absolute path":     `fs.walk(` + quote(filepath.Join(parent, "outside")) + `)`,
		"unsupported os.getenv":  `import os` + "\n" + `os.getenv("HOME")`,
		"pathlib read":           `from pathlib import Path` + "\n" + `Path("inside.txt").read_text()`,
		"missing file":           `fs.read("missing.txt")`,
		"walk missing directory": `fs.walk("missing")`,
	}
	if err := os.Symlink(outside, filepath.Join(dir, "link.txt")); err == nil {
		scripts["symlinked file"] = `fs.read("link.txt")`
	}
	if err := os.Symlink(filepath.Join(parent, "outside"), filepath.Join(dir, "linkdir")); err == nil {
		scripts["walk symlinked directory"] = `fs.walk("linkdir")`
	}

	for name, script := range scripts {
		t.Run(name, func(t *testing.T) {
			result, err := p.RunInDir(context.Background(), dir, script, nil)
			if err == nil {
				t.Fatalf("expected an error, got %#v", result.Values)
			}
			if strings.Contains(err.Error(), "outside") || strings.Contains(err.Error(), "secret") {
				t.Fatalf("error leaked file details: %v", err)
			}
		})
	}

	result, err := p.RunInDir(context.Background(), dir, `
try:
    fs.read("../outside.txt")
except OSError:
    values["escape"] = "OSError"
try:
    fs.read("missing.txt")
except FileNotFoundError:
    values["missing"] = "FileNotFoundError"
try:
    fs.walk("inside.txt/nope")
except OSError:
    values["notDir"] = "OSError"
`, nil)
	if err != nil {
		t.Fatalf("RunInDir: %v", err)
	}
	expected := map[string]any{"escape": "OSError", "missing": "FileNotFoundError", "notDir": "OSError"}
	if !reflect.DeepEqual(result.Values, expected) {
		t.Fatalf("unexpected exception handling: %#v", result.Values)
	}
}

func TestRunFSArgumentErrors(t *testing.T) {
	p := testPool(t, Config{WorkerCount: 1, QueueSize: 1})
	dir := t.TempDir()
	writeTestFile(t, dir, "binary.bin", "\xff\xfe")
	writeTestFile(t, dir, "sub/file.txt", "x")

	for script, kind := range map[string]string{
		`fs.read()`:                            "TypeError",
		`fs.read(1)`:                           "TypeError",
		`fs.read("a", "b")`:                    "TypeError",
		`fs.read(path="a")`:                    "TypeError",
		`fs.walk()`:                            "TypeError",
		`fs.walk("sub", "yes")`:                "TypeError",
		`fs.walk("sub", recursive=True)`:       "TypeError",
		`fs.walk("sub", True, True)`:           "TypeError",
		`fs.read("binary.bin")`:                "UnicodeDecodeError",
		`fs.read("sub")`:                       "IsADirectoryError",
		`fs.write("a", "b")`:                   "AttributeError",
		`fs.read = None`:                       "FrozenInstanceError",
		`yaml_encode(fs)`:                      "TypeError",
		`fs.walk("sub/file.txt/nested", True)`: "NotADirectoryError",
	} {
		_, err := p.RunInDir(context.Background(), dir, script, nil)
		if err == nil || !strings.Contains(err.Error(), "python "+kind) {
			t.Errorf("%s: expected %s, got %v", script, kind, err)
		}
	}
}

func TestRunWithoutDirectoryHasNoFS(t *testing.T) {
	p := testPool(t, Config{WorkerCount: 1, QueueSize: 1})

	_, err := p.Run(context.Background(), `fs.read("values.yaml")`, nil)
	if err == nil || !strings.Contains(err.Error(), "python OSError") {
		t.Fatalf("expected OSError without a directory, got %v", err)
	}
}

func quote(value string) string {
	return `"` + strings.ReplaceAll(value, `\`, `\\`) + `"`
}
