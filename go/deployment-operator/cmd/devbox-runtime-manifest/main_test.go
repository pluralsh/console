package main

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/runtimemanifest"
)

const testSpec = `{
  "contract": "v1",
  "components": {
    "daemon": {"version": "@daemon", "bin": {"devbox-daemon": {"path": "bin/devbox-daemon"}}},
    "node": {"version": "@node", "private": true, "bin": {"node": {"path": "bin/node"}}},
    "pi": {"package": "@scope/pi", "requires": ["node"], "bin": {"pi": {"path": "cli.js", "interpreter": "node"}}}
  },
  "agents": {"pi": {"component": "pi", "command": "pi", "acp": {"component": "pi", "command": "pi"}}}
}`

func fixture(t *testing.T) (spec, installed, components string) {
	t.Helper()
	root := t.TempDir()
	files := map[string]string{
		"spec.json":                           testSpec,
		"versions.txt":                        "pi 0.84.1\n",
		"components/daemon/bin/devbox-daemon": "daemon",
		"components/node/bin/node":            "node",
		"components/pi/cli.js":                "pi",
	}
	for rel, data := range files {
		path := filepath.Join(root, rel)
		require.NoError(t, os.MkdirAll(filepath.Dir(path), 0o755))
		mode := os.FileMode(0o644)
		if filepath.Base(filepath.Dir(path)) == "bin" {
			mode = 0o755
		}
		require.NoError(t, os.WriteFile(path, []byte(data), mode))
	}
	return filepath.Join(root, "spec.json"), filepath.Join(root, "versions.txt"), filepath.Join(root, "components")
}

var versions = map[string]string{"@daemon": "0.7.0", "@node": "24.11.1"}

func TestBuild(t *testing.T) {
	spec, installed, components := fixture(t)
	m, err := build(spec, installed, components, versions)
	require.NoError(t, err)

	assert.Equal(t, "0.7.0", m.Components["daemon"].Version)
	assert.Equal(t, "24.11.1", m.Components["node"].Version)
	assert.Equal(t, "0.84.1", m.Components["pi"].Version)
	hash, err := runtimemanifest.HashDir(filepath.Join(components, "pi"))
	require.NoError(t, err)
	assert.Equal(t, hash, m.Components["pi"].Hash)

	out := filepath.Join(t.TempDir(), "manifest.json")
	require.NoError(t, write(out, m))
	loaded, err := runtimemanifest.Load(out)
	require.NoError(t, err)
	assert.Equal(t, m, loaded)
}

func TestBuildRejects(t *testing.T) {
	for name, edit := range map[string]func(t *testing.T, installed, components string){
		"package not installed": func(t *testing.T, installed, _ string) {
			require.NoError(t, os.WriteFile(installed, []byte("other 1.0.0\n"), 0o644))
		},
		"invalid versions file": func(t *testing.T, installed, _ string) {
			require.NoError(t, os.WriteFile(installed, []byte("pi\n"), 0o644))
		},
		"missing command": func(t *testing.T, _, components string) {
			require.NoError(t, os.Remove(filepath.Join(components, "pi", "cli.js")))
		},
		"command not executable": func(t *testing.T, _, components string) {
			require.NoError(t, os.Chmod(filepath.Join(components, "daemon", "bin", "devbox-daemon"), 0o644))
		},
		"component not in the spec": func(t *testing.T, _, components string) {
			require.NoError(t, os.MkdirAll(filepath.Join(components, "extra"), 0o755))
		},
	} {
		t.Run(name, func(t *testing.T) {
			spec, installed, components := fixture(t)
			edit(t, installed, components)
			_, err := build(spec, installed, components, versions)
			assert.Error(t, err)
		})
	}
}
