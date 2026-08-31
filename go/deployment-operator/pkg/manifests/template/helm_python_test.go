package template

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"testing"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/deployment-operator/pkg/python"
)

func TestPythonValuesUsesBindingsAndFolderOrder(t *testing.T) {
	dir := t.TempDir()
	writePythonFile(t, dir, "python/02-second.py", `values["order"] += "-second"`)
	writePythonFile(t, dir, "python/01-first.py", `values["order"] = "first"`)

	p, err := python.NewPoolWithConfig(python.Config{WorkerCount: 1, QueueSize: 1})
	if err != nil {
		t.Fatalf("NewPoolWithConfig: %v", err)
	}
	t.Cleanup(func() { _ = p.Close() })

	svc := &console.ServiceDeploymentForAgent{
		Name:      "demo",
		Namespace: "default",
		Cluster: &console.ServiceDeploymentForAgent_Cluster{
			Version: new("1.2.3"),
		},
		Helm: &console.ServiceDeploymentForAgent_Helm{
			PythonFolder: new("python"),
			PythonScript: new(`
values["order"] += "-main"
values["version"] = cluster["version"]
valuesFiles.append("generated.yaml")
`),
		},
		Configuration: []*console.ServiceDeploymentForAgent_Configuration{{Name: "environment", Value: "test"}},
	}

	h := &helm{dir: dir, pythonPool: p}
	result, valuesFiles, err := h.pythonValues(context.Background(), svc)
	if err != nil {
		t.Fatalf("pythonValues: %v", err)
	}
	if result["order"] != "first-second-main" {
		t.Fatalf("unexpected folder order result: %#v", result)
	}
	if result["version"] != "1.2.3" {
		t.Fatalf("binding was not available: %#v", result)
	}
	if len(valuesFiles) != 1 || valuesFiles[0] != "generated.yaml" {
		t.Fatalf("unexpected valuesFiles: %#v", valuesFiles)
	}
}

func TestPythonValuesInlineScriptWinsOverFile(t *testing.T) {
	dir := t.TempDir()
	writePythonFile(t, dir, "values.py", `values["source"] = "file"`)

	p, err := python.NewPoolWithConfig(python.Config{WorkerCount: 1, QueueSize: 1})
	if err != nil {
		t.Fatalf("NewPoolWithConfig: %v", err)
	}
	t.Cleanup(func() { _ = p.Close() })

	svc := &console.ServiceDeploymentForAgent{
		Helm: &console.ServiceDeploymentForAgent_Helm{
			PythonFile:   new("values.py"),
			PythonScript: new(`values["source"] = "inline"`),
		},
	}
	result, _, err := (&helm{dir: dir, pythonPool: p}).pythonValues(context.Background(), svc)
	if err != nil {
		t.Fatalf("pythonValues: %v", err)
	}
	if result["source"] != "inline" {
		t.Fatalf("inline script did not win: %#v", result)
	}
}

func TestPythonValuesCannotReadPythonFileOutsideDirectory(t *testing.T) {
	dir := t.TempDir()
	outsideDir := t.TempDir()
	outsideFile := filepath.Join(outsideDir, "outside.py")
	writePythonFile(t, outsideDir, "outside.py", `values["escaped"] = true`)

	outsidePath, err := filepath.Rel(dir, outsideFile)
	if err != nil {
		t.Fatalf("Rel: %v", err)
	}

	paths := []struct {
		name string
		path string
	}{
		{name: "path traversal", path: outsidePath},
	}
	symlinkPath := filepath.Join(dir, "link.py")
	if err := os.Symlink(outsideFile, symlinkPath); err != nil {
		t.Logf("skipping symlink case: %v", err)
	} else {
		paths = append(paths, struct {
			name string
			path string
		}{name: "symlink", path: "link.py"})
	}

	p, err := python.NewPoolWithConfig(python.Config{WorkerCount: 1, QueueSize: 1})
	if err != nil {
		t.Fatalf("NewPoolWithConfig: %v", err)
	}
	t.Cleanup(func() { _ = p.Close() })

	for _, test := range paths {
		t.Run(test.name, func(t *testing.T) {
			svc := &console.ServiceDeploymentForAgent{
				Helm: &console.ServiceDeploymentForAgent_Helm{PythonFile: new(test.path)},
			}
			_, _, err := (&helm{dir: dir, pythonPool: p}).pythonValues(context.Background(), svc)
			if err == nil {
				t.Fatalf("expected Python file path %q to be rejected", test.path)
			}
		})
	}
}

func TestPythonFolderCannotReadOutsideDirectory(t *testing.T) {
	dir := t.TempDir()
	outsideDir := t.TempDir()
	writePythonFile(t, outsideDir, "outside.py", `values["escaped"] = true`)

	outsidePath, err := filepath.Rel(dir, outsideDir)
	if err != nil {
		t.Fatalf("Rel: %v", err)
	}
	if _, err := (&helm{dir: dir}).pythonFolder(outsidePath); err == nil {
		t.Fatalf("expected Python folder path %q to be rejected", outsidePath)
	}
	if err := os.Symlink(outsideDir, filepath.Join(dir, "linked-folder")); err != nil {
		t.Logf("skipping symlinked Python folder case: %v", err)
	} else if _, err := (&helm{dir: dir}).pythonFolder("linked-folder"); err == nil {
		t.Fatal("expected symlinked Python folder to be rejected")
	}

	folder := filepath.Join(dir, "python")
	if err := os.MkdirAll(folder, 0o755); err != nil {
		t.Fatalf("MkdirAll: %v", err)
	}
	if err := os.Symlink(filepath.Join(outsideDir, "outside.py"), filepath.Join(folder, "link.py")); err != nil {
		t.Logf("skipping symlinked Python file case: %v", err)
		return
	}
	if _, err := (&helm{dir: dir}).pythonFolder("python"); err == nil {
		t.Fatal("expected symlinked Python file to be rejected")
	}
}

func TestTemplateValuesCannotReadValuesFileOutsideDirectory(t *testing.T) {
	dir := t.TempDir()
	outsideDir := t.TempDir()
	outsideFile := filepath.Join(outsideDir, "outside.yaml")
	writePythonFile(t, outsideDir, "outside.yaml", "escaped: true\n")

	outsidePath, err := filepath.Rel(dir, outsideFile)
	if err != nil {
		t.Fatalf("Rel: %v", err)
	}

	p, err := python.NewPoolWithConfig(python.Config{WorkerCount: 1, QueueSize: 1})
	if err != nil {
		t.Fatalf("NewPoolWithConfig: %v", err)
	}
	t.Cleanup(func() { _ = p.Close() })

	svc := &console.ServiceDeploymentForAgent{
		Helm: &console.ServiceDeploymentForAgent_Helm{
			PythonScript: new(fmt.Sprintf("valuesFiles.append(%q)", outsidePath)),
		},
	}
	if _, err := (&helm{dir: dir, pythonPool: p}).templateValues(svc); err == nil {
		t.Fatalf("expected values file path %q to be rejected", outsidePath)
	}
}

func TestPythonValuesErrorIsContextualized(t *testing.T) {
	p, err := python.NewPoolWithConfig(python.Config{WorkerCount: 1, QueueSize: 1})
	if err != nil {
		t.Fatalf("NewPoolWithConfig: %v", err)
	}
	t.Cleanup(func() { _ = p.Close() })

	svc := &console.ServiceDeploymentForAgent{
		Helm: &console.ServiceDeploymentForAgent_Helm{
			PythonScript: new(`raise ValueError("not safe to render")`),
		},
	}
	_, _, err = (&helm{dir: t.TempDir(), pythonPool: p}).pythonValues(context.Background(), svc)
	if err == nil || !strings.Contains(err.Error(), "python") {
		t.Fatalf("expected Python error, got %v", err)
	}
}

func TestTemplateValuesRunsLuaBeforePython(t *testing.T) {
	dir := t.TempDir()
	writePythonFile(t, dir, "lua.yaml", "fromLua: true\n")
	writePythonFile(t, dir, "python.yaml", "fromPython: true\n")

	p, err := python.NewPoolWithConfig(python.Config{WorkerCount: 1, QueueSize: 1})
	if err != nil {
		t.Fatalf("NewPoolWithConfig: %v", err)
	}
	t.Cleanup(func() { _ = p.Close() })

	svc := &console.ServiceDeploymentForAgent{
		Helm: &console.ServiceDeploymentForAgent_Helm{
			LuaScript: new(`values["collision"] = "lua"
valuesFiles[1] = "lua.yaml"`),
			PythonScript: new(`values["collision"] = "python"
valuesFiles.append("python.yaml")`),
		},
	}
	result, err := (&helm{dir: dir, pythonPool: p}).templateValues(svc)
	if err != nil {
		t.Fatalf("templateValues: %v", err)
	}
	if result["collision"] != "python" || result["fromLua"] != true || result["fromPython"] != true {
		t.Fatalf("unexpected merged values: %#v", result)
	}
}

func writePythonFile(t *testing.T, dir, name, contents string) {
	t.Helper()
	path := dir + "/" + name
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		t.Fatalf("MkdirAll: %v", err)
	}
	if err := os.WriteFile(path, []byte(contents), 0o644); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}
}
