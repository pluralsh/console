package python

import (
	"context"
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"testing"
)

func writeTree(t *testing.T, dir string, files map[string]string) {
	t.Helper()
	for name, contents := range files {
		path := filepath.Join(dir, name)
		if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
			t.Fatalf("MkdirAll: %v", err)
		}
		if err := os.WriteFile(path, []byte(contents), 0o644); err != nil {
			t.Fatalf("WriteFile: %v", err)
		}
	}
}

func fsTestDir(t *testing.T) string {
	t.Helper()
	dir := t.TempDir()
	writeTree(t, dir, map[string]string{
		"values.yaml":    "replicas: 2\n",
		"a.txt":          "a",
		"a/x":            "ax",
		"sub/b.txt":      "b",
		"sub/.env":       "secret",
		"sub/deep/d.txt": "d",
		".git/config":    "git",
	})
	if err := os.Symlink("sub", filepath.Join(dir, "link")); err != nil {
		t.Fatalf("Symlink: %v", err)
	}
	return dir
}

func TestRunInDirFsReadAndWalk(t *testing.T) {
	p := testPool(t, Config{WorkerCount: 1, QueueSize: 1})

	result, err := p.RunInDir(context.Background(), fsTestDir(t), `
from pathlib import Path
values["read"] = fs.read("values.yaml")
values["absolute"] = fs.read("/sub/b.txt")
values["through_link"] = fs.read("link/b.txt")
values["pathlib"] = Path("sub/b.txt").read_text()
values["open"] = open("a.txt").read()
values["all"] = fs.walk(".")
values["visible"] = fs.walk("", True)
values["sub"] = fs.walk("sub", ignore_dotfiles=True)
values["file"] = fs.walk("sub/b.txt")
values["dot_dir"] = fs.walk(".git", True)
`, nil)
	if err != nil {
		t.Fatalf("RunInDir: %v", err)
	}

	want := map[string]any{
		"read":         "replicas: 2\n",
		"absolute":     "b",
		"through_link": "b",
		"pathlib":      "b",
		"open":         "a",
		"all":          []any{".git/config", "a/x", "a.txt", "link", "sub/.env", "sub/b.txt", "sub/deep/d.txt", "values.yaml"},
		"visible":      []any{"a/x", "a.txt", "link", "sub/b.txt", "sub/deep/d.txt", "values.yaml"},
		"sub":          []any{"sub/b.txt", "sub/deep/d.txt"},
		"file":         []any{"sub/b.txt"},
		"dot_dir":      []any{},
	}
	for key, expected := range want {
		if !reflect.DeepEqual(result.Values[key], expected) {
			t.Errorf("values[%q] = %#v, want %#v", key, result.Values[key], expected)
		}
	}
}

func TestRunInDirFsRaisesPythonErrors(t *testing.T) {
	p := testPool(t, Config{WorkerCount: 1, QueueSize: 1})
	dir := fsTestDir(t)

	for script, kind := range map[string]string{
		`fs.read("missing.txt")`:          "FileNotFoundError",
		`fs.walk("missing")`:              "FileNotFoundError",
		`fs.read("sub")`:                  "IsADirectoryError",
		`fs.read(1)`:                      "TypeError",
		`fs.read("../../etc/passwd")`:     "PermissionError",
		`fs.walk("..")`:                   "PermissionError",
		`open("/etc/passwd").read()`:      "PermissionError",
		`open("new.txt", "w").write("x")`: "PermissionError",
		"from pathlib import Path\nPath(\"a.txt\").write_text(\"x\")": "PermissionError",
	} {
		t.Run(script, func(t *testing.T) {
			_, err := p.RunInDir(context.Background(), dir, script, nil)
			if err == nil || !strings.Contains(err.Error(), "python "+kind+" at helm-values.py:") {
				t.Fatalf("expected %s at the script line, got %v", kind, err)
			}
		})
	}

	if data, err := os.ReadFile(filepath.Join(dir, "a.txt")); err != nil || string(data) != "a" {
		t.Fatalf("read-only mount was modified: %q, %v", data, err)
	}
	if _, err := os.Stat(filepath.Join(dir, "new.txt")); !os.IsNotExist(err) {
		t.Fatalf("read-only mount created a file: %v", err)
	}
}

func TestRunHasNoFilesystemWithoutDir(t *testing.T) {
	p := testPool(t, Config{WorkerCount: 1, QueueSize: 1})

	_, err := p.Run(context.Background(), `fs.read("values.yaml")`, nil)
	if err == nil || !strings.Contains(err.Error(), "python PermissionError") {
		t.Fatalf("expected PermissionError without a directory, got %v", err)
	}
}

func TestPoolMemoryLimitScalesWithWorkers(t *testing.T) {
	p := testPool(t, Config{WorkerCount: 3, QueueSize: 3})

	if got, want := p.limits().MaxMemory, 3*maxMemoryBytes; got != want {
		t.Fatalf("MaxMemory = %d, want %d", got, want)
	}
}
