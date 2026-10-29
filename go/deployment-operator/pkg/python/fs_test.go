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

const symlinkSecret = "outside-secret-7f3a"

// symlinkEscapeDir returns a mounted directory whose symlinks all point outside
// it, at a secret file and a directory holding one.
func symlinkEscapeDir(t *testing.T) string {
	t.Helper()
	parent := t.TempDir()
	outside := filepath.Join(parent, "outside")
	dir := filepath.Join(parent, "repo")
	writeTree(t, outside, map[string]string{"secret.txt": symlinkSecret})
	writeTree(t, dir, map[string]string{"values.yaml": "ok", "nested/keep.txt": "ok"})

	for link, target := range map[string]string{
		"abs_file":         filepath.Join(outside, "secret.txt"),
		"abs_dir":          outside,
		"rel_file":         "../outside/secret.txt",
		"rel_dir":          "../outside",
		"nested/climb":     "../../outside/secret.txt",
		"chain":            "abs_file",
		"root":             "/",
		"nested/dot_climb": "../..",
	} {
		if err := os.Symlink(target, filepath.Join(dir, link)); err != nil {
			t.Fatalf("Symlink %s: %v", link, err)
		}
	}
	return dir
}

func TestRunInDirSymlinksCannotEscape(t *testing.T) {
	p := testPool(t, Config{WorkerCount: 1, QueueSize: 1})
	dir := symlinkEscapeDir(t)

	for _, script := range []string{
		`values["v"] = fs.read("abs_file")`,
		`values["v"] = fs.read("rel_file")`,
		`values["v"] = fs.read("nested/climb")`,
		`values["v"] = fs.read("chain")`,
		`values["v"] = fs.read("abs_dir/secret.txt")`,
		`values["v"] = fs.read("rel_dir/secret.txt")`,
		`values["v"] = fs.read("nested/dot_climb/outside/secret.txt")`,
		`values["v"] = fs.read("root` + filepath.Join(filepath.Dir(dir), "outside", "secret.txt") + `")`,
		`values["v"] = open("abs_file").read()`,
		`values["v"] = open("rel_dir/secret.txt").read()`,
		"from pathlib import Path\nvalues[\"v\"] = Path(\"chain\").read_text()",
		"from pathlib import Path\nvalues[\"v\"] = Path(\"abs_dir/secret.txt\").read_text()",
		"from pathlib import Path\nvalues[\"v\"] = [str(p) for p in Path(\"abs_dir\").iterdir()]",
		"import os\nvalues[\"v\"] = os.listdir(\"rel_dir\")",
		`values["v"] = fs.walk("abs_dir/.")`,
	} {
		t.Run(script, func(t *testing.T) {
			result, err := p.RunInDir(context.Background(), dir, script, nil)
			if err == nil {
				t.Fatalf("escaped the mount, got %#v", result.Values)
			}
			if strings.Contains(err.Error(), symlinkSecret) || strings.Contains(err.Error(), "secret.txt") {
				t.Fatalf("error exposed the outside file: %v", err)
			}
			if !strings.Contains(err.Error(), "python PermissionError at helm-values.py:") {
				t.Fatalf("expected PermissionError, got %v", err)
			}
		})
	}
}

func TestRunInDirWalksDoNotFollowEscapingSymlinks(t *testing.T) {
	p := testPool(t, Config{WorkerCount: 1, QueueSize: 1})

	result, err := p.RunInDir(context.Background(), symlinkEscapeDir(t), `
import os
values["fs"] = fs.walk(".")
values["os"] = sorted([os.path.join(d, f) for d, _, fs in os.walk(".") for f in fs])
values["escaped_dir"] = [f for _, _, fs in os.walk("abs_dir") for f in fs]
`, nil)
	if err != nil {
		t.Fatalf("RunInDir: %v", err)
	}
	// Escaping symlinks are not listed at all, and os.walk skips a directory
	// it can not read, as CPython does.
	for key, want := range map[string]any{
		"fs":          []any{"nested/keep.txt", "values.yaml"},
		"os":          []any{"./nested/keep.txt", "./values.yaml"},
		"escaped_dir": []any{},
	} {
		if !reflect.DeepEqual(result.Values[key], want) {
			t.Errorf("values[%q] = %#v, want %#v", key, result.Values[key], want)
		}
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
