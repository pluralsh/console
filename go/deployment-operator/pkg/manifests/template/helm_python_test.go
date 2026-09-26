package template

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"testing"

	console "github.com/pluralsh/console/go/client"
	"github.com/samber/lo"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"

	"github.com/pluralsh/console/go/deployment-operator/pkg/python"
	"github.com/pluralsh/console/go/deployment-operator/pkg/streamline"
	"github.com/pluralsh/console/go/deployment-operator/pkg/streamline/store"
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
			Version: lo.ToPtr("1.2.3"),
		},
		Helm: &console.ServiceDeploymentForAgent_Helm{
			PythonFolder: lo.ToPtr("python"),
			PythonScript: lo.ToPtr(`
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
			PythonFile:   lo.ToPtr("values.py"),
			PythonScript: lo.ToPtr(`values["source"] = "inline"`),
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
				Helm: &console.ServiceDeploymentForAgent_Helm{PythonFile: lo.ToPtr(test.path)},
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
			PythonScript: lo.ToPtr(fmt.Sprintf("valuesFiles.append(%q)", outsidePath)),
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
			PythonScript: lo.ToPtr(`raise ValueError("not safe to render")`),
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
			LuaScript: lo.ToPtr(`values["collision"] = "lua"
valuesFiles[1] = "lua.yaml"`),
			PythonScript: lo.ToPtr(`values["collision"] = "python"
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

func TestPythonValuesK8sObjectMeta(t *testing.T) {
	python.SetObjectMetaLookup(streamline.LookupObjectMeta)
	t.Cleanup(func() { python.SetObjectMetaLookup(nil) })

	t.Run("reads kube-system metadata from the cache", func(t *testing.T) {
		streamline.ResetGlobalStore()
		storeInstance, err := store.NewDatabaseStore(context.Background())
		if err != nil {
			t.Fatalf("NewDatabaseStore: %v", err)
		}
		t.Cleanup(func() {
			streamline.ResetGlobalStore()
			_ = storeInstance.Shutdown()
		})
		streamline.InitGlobalStore(storeInstance)

		ns := unstructured.Unstructured{}
		ns.SetGroupVersionKind(schema.GroupVersionKind{Version: "v1", Kind: "Namespace"})
		ns.SetName("kube-system")
		ns.SetUID(types.UID("cfb1383b-37cc-4d91-b943-aab5119e4cb1"))
		ns.SetLabels(map[string]string{"kubernetes.io/metadata.name": "kube-system"})
		if err := storeInstance.SaveComponent(ns); err != nil {
			t.Fatalf("SaveComponent: %v", err)
		}

		p, err := python.NewPoolWithConfig(python.Config{WorkerCount: 1, QueueSize: 1})
		if err != nil {
			t.Fatalf("NewPoolWithConfig: %v", err)
		}
		t.Cleanup(func() { _ = p.Close() })

		svc := &console.ServiceDeploymentForAgent{
			Helm: &console.ServiceDeploymentForAgent_Helm{
				PythonScript: lo.ToPtr(`
ns = k8s_object_meta("", "v1", "Namespace", "", "kube-system")
values["observeClusterId"] = ns["uid"]
values["name"] = ns["name"]
values["namespace"] = ns["namespace"]
values["label"] = ns["labels"]["kubernetes.io/metadata.name"]
`),
			},
		}
		result, _, err := (&helm{dir: t.TempDir(), pythonPool: p}).pythonValues(context.Background(), svc)
		if err != nil {
			t.Fatalf("pythonValues: %v", err)
		}
		if result["observeClusterId"] != "cfb1383b-37cc-4d91-b943-aab5119e4cb1" {
			t.Fatalf("unexpected uid: %#v", result)
		}
		if result["name"] != "kube-system" || result["namespace"] != "" {
			t.Fatalf("unexpected identity: %#v", result)
		}
		if result["label"] != "kube-system" {
			t.Fatalf("unexpected label: %#v", result)
		}
	})

	t.Run("returns None on a cache miss", func(t *testing.T) {
		streamline.ResetGlobalStore()
		storeInstance, err := store.NewDatabaseStore(context.Background())
		if err != nil {
			t.Fatalf("NewDatabaseStore: %v", err)
		}
		t.Cleanup(func() {
			streamline.ResetGlobalStore()
			_ = storeInstance.Shutdown()
		})
		streamline.InitGlobalStore(storeInstance)

		p, err := python.NewPoolWithConfig(python.Config{WorkerCount: 1, QueueSize: 1})
		if err != nil {
			t.Fatalf("NewPoolWithConfig: %v", err)
		}
		t.Cleanup(func() { _ = p.Close() })

		svc := &console.ServiceDeploymentForAgent{
			Helm: &console.ServiceDeploymentForAgent_Helm{
				PythonScript: lo.ToPtr(`
missing = k8s_object_meta("apps", "v1", "Deployment", "default", "missing")
values["missing"] = missing is None
`),
			},
		}
		result, _, err := (&helm{dir: t.TempDir(), pythonPool: p}).pythonValues(context.Background(), svc)
		if err != nil {
			t.Fatalf("pythonValues: %v", err)
		}
		if result["missing"] != true {
			t.Fatalf("expected None on cache miss: %#v", result)
		}
	})
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

func TestPythonValuesWarnings(t *testing.T) {
	p, err := python.NewPoolWithConfig(python.Config{WorkerCount: 1, QueueSize: 1})
	if err != nil {
		t.Fatalf("NewPoolWithConfig: %v", err)
	}
	t.Cleanup(func() { _ = p.Close() })

	svc := &console.ServiceDeploymentForAgent{
		Helm: &console.ServiceDeploymentForAgent_Helm{
			PythonScript: lo.ToPtr(`
values["key"] = "value"
warn("first warning")
warnings.append("second warning")
`),
		},
	}

	h := &helm{dir: t.TempDir(), pythonPool: p}
	if _, _, err := h.pythonValues(context.Background(), svc); err != nil {
		t.Fatalf("pythonValues: %v", err)
	}

	warnings := h.Warnings()
	if len(warnings) != 2 {
		t.Fatalf("unexpected warnings: %#v", warnings)
	}
	for i, message := range []string{"first warning", "second warning"} {
		if warnings[i].Source != pythonWarningSource || warnings[i].Message != message || !lo.FromPtr(warnings[i].Warning) {
			t.Fatalf("unexpected warning %d: %#v", i, warnings[i])
		}
	}
}
