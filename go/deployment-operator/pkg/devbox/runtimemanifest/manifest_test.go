package runtimemanifest

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

var testHash = strings.Repeat("ab", 32)

func testManifest() *Manifest {
	return &Manifest{
		Contract: Contract,
		Components: map[string]Component{
			Daemon:           {Hash: testHash, Bin: map[string]Bin{"devbox-daemon": {Path: "bin/devbox-daemon"}}},
			"node":           {Hash: testHash, Private: true, Bin: map[string]Bin{"node": {Path: "bin/node"}}},
			"claude":         {Hash: testHash, Bin: map[string]Bin{"claude": {Path: "bin/claude"}}},
			"claude-acp":     {Hash: testHash, Requires: []string{"node"}, Bin: map[string]Bin{"claude-agent-acp": {Path: "index.mjs", Interpreter: "node"}}},
			"pi":             {Hash: testHash, Requires: []string{"node"}, Bin: map[string]Bin{"pi": {Path: "cli.js", Interpreter: "node"}}},
			"pi-mcp-adapter": {Hash: testHash},
			"playwright-mcp": {Hash: testHash, Requires: []string{"node"}, Bin: map[string]Bin{"playwright-mcp": {Path: "cli.js", Interpreter: "node"}}},
		},
		Agents: map[string]Agent{
			"claude": {Tool: Tool{Component: "claude", Command: "claude"}, ACP: Tool{Component: "claude-acp", Command: "claude-agent-acp"},
				Env: map[string]string{"CLAUDE_CODE_EXECUTABLE": "${bin}/claude"}},
			"pi": {Tool: Tool{Component: "pi", Command: "pi"}, ACP: Tool{Component: "pi", Command: "pi"}, Components: []string{"pi-mcp-adapter"},
				Env: map[string]string{"PI_MCP_ADAPTER_DIR": "${component:pi-mcp-adapter}"}},
		},
		PlaywrightMCP: &Tool{Component: "playwright-mcp", Command: "playwright-mcp"},
	}
}

func TestValidate(t *testing.T) {
	require.NoError(t, testManifest().Validate())

	for name, edit := range map[string]func(m *Manifest){
		"contract":            func(m *Manifest) { m.Contract = "v0" },
		"no daemon":           func(m *Manifest) { delete(m.Components, Daemon) },
		"component name":      func(m *Manifest) { m.Components["../x"] = Component{Hash: testHash} },
		"hidden name":         func(m *Manifest) { m.Components[".x"] = Component{Hash: testHash} },
		"hash":                func(m *Manifest) { m.Components["x"] = Component{Hash: "abc"} },
		"unknown requirement": func(m *Manifest) { c := m.Components["pi"]; c.Requires = []string{"x"}; m.Components["pi"] = c },
		"escaping path": func(m *Manifest) {
			m.Components["x"] = Component{Hash: testHash, Bin: map[string]Bin{"x": {Path: "../../etc/passwd"}}}
		},
		"absolute path": func(m *Manifest) {
			m.Components["x"] = Component{Hash: testHash, Bin: map[string]Bin{"x": {Path: "/etc/passwd"}}}
		},
		"shell characters in a path": func(m *Manifest) {
			m.Components["x"] = Component{Hash: testHash, Bin: map[string]Bin{"x": {Path: "a\"$(id)"}}}
		},
		"duplicate command": func(m *Manifest) {
			m.Components["x"] = Component{Hash: testHash, Bin: map[string]Bin{"devbox-daemon": {Path: "x"}}}
		},
		"command name": func(m *Manifest) {
			m.Components["x"] = Component{Hash: testHash, Bin: map[string]Bin{"a/b": {Path: "x"}}}
		},
		"interpreter not required": func(m *Manifest) {
			m.Components["x"] = Component{Hash: testHash, Bin: map[string]Bin{"x": {Path: "x", Interpreter: "node"}}}
		},
		"agent command": func(m *Manifest) { a := m.Agents["claude"]; a.Command = "nope"; m.Agents["claude"] = a },
		"agent extension": func(m *Manifest) {
			a := m.Agents["pi"]
			a.Components = []string{"nope"}
			m.Agents["pi"] = a
		},
		"playwright": func(m *Manifest) { m.PlaywrightMCP = &Tool{Component: "nope", Command: "x"} },
	} {
		t.Run(name, func(t *testing.T) {
			m := testManifest()
			edit(m)
			assert.Error(t, m.Validate())
		})
	}
}

func TestSelect(t *testing.T) {
	m := testManifest()

	components, missing := m.Select(nil, false)
	assert.Equal(t, []string{Daemon}, components)
	assert.Empty(t, missing)

	components, missing = m.Select([]string{"claude", "gemini"}, false)
	assert.Equal(t, []string{"claude", "claude-acp", Daemon, "node"}, components)
	assert.Equal(t, []string{"gemini"}, missing)

	components, _ = m.Select([]string{"pi"}, true)
	assert.Equal(t, []string{Daemon, "node", "pi", "pi-mcp-adapter", "playwright-mcp"}, components)
}

func TestInstalledAndExpand(t *testing.T) {
	m := testManifest()
	components, _ := m.Select([]string{"pi"}, false)
	installed := m.Installed(components, func(name string) string { return "../components/" + name })

	assert.ElementsMatch(t, components, keysOf(installed.Components))
	assert.Equal(t, []string{"pi"}, keysOf(installed.Agents), "claude's components aren't installed")
	assert.Nil(t, installed.PlaywrightMCP)
	require.NoError(t, installed.Validate())

	dir := "/home/dev/.plural-runtime/sha256-aaaa"
	assert.Equal(t, "/home/dev/.plural-runtime/components/pi-mcp-adapter", installed.Expand(dir, "${component:pi-mcp-adapter}"))
	assert.Equal(t, dir+"/bin/claude", installed.Expand(dir, "${bin}/claude"))
}

func TestHashDir(t *testing.T) {
	dir := t.TempDir()
	require.NoError(t, os.MkdirAll(filepath.Join(dir, "bin"), 0o755))
	require.NoError(t, os.WriteFile(filepath.Join(dir, "bin", "x"), []byte("x"), 0o755))
	require.NoError(t, os.WriteFile(filepath.Join(dir, "data"), []byte("d"), 0o644))

	a, err := HashDir(dir)
	require.NoError(t, err)
	again, err := HashDir(dir)
	require.NoError(t, err)
	assert.Equal(t, a, again)
	assert.Len(t, a, 64)

	require.NoError(t, os.Chmod(filepath.Join(dir, "data"), 0o755))
	mode, err := HashDir(dir)
	require.NoError(t, err)
	assert.NotEqual(t, a, mode, "the executable bit is part of the hash")

	require.NoError(t, os.Rename(filepath.Join(dir, "data"), filepath.Join(dir, "moved")))
	moved, err := HashDir(dir)
	require.NoError(t, err)
	assert.NotEqual(t, mode, moved, "paths are part of the hash")

	require.NoError(t, os.Symlink("x", filepath.Join(dir, "link")))
	_, err = HashDir(dir)
	assert.Error(t, err)
}

func keysOf[V any](m map[string]V) []string {
	var out []string
	for k := range m {
		out = append(out, k)
	}
	return out
}
