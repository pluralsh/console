package main

import (
	"encoding/json"
	"maps"
	"os"
	"os/exec"
	"path/filepath"
	"slices"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/runtimemanifest"
)

const (
	digestA = "sha256:aaaa"
	digestB = "sha256:bbbb"
	// testShell is the shell most tests install the launchers for.
	testShell = runtimemanifest.DefaultShell
)

// The install IDs and directories of digestA and digestB installed for claude alone, as most tests do.
var (
	idA  = runtimemanifest.InstallID(digestA, []string{"claude"}, false, testShell)
	idB  = runtimemanifest.InstallID(digestB, []string{"claude"}, false, testShell)
	dirA = runtimemanifest.InstallDirName(idA)
	dirB = runtimemanifest.InstallDirName(idB)
)

// payload is a runtime payload with a daemon, Node, a native agent (claude, with a script ACP adapter) and an
// agent with an extension (pi), in the layout runtime-core.Dockerfile builds. files overrides component files,
// keyed "<component>/<path>".
func payload(t *testing.T, daemon string, files map[string]string) string {
	t.Helper()
	src := t.TempDir()
	content := map[string]string{
		"daemon/bin/devbox-daemon":               daemon,
		"node/bin/node":                          "#!/bin/sh\necho node \"$@\"\n",
		"claude/bin/claude":                      "#!/bin/sh\necho claude\n",
		"claude-acp/index.mjs":                   "acp",
		"pi/node_modules/pi/cli.js":              "pi",
		"pi/node_modules/pi/package.json":        "{}",
		"pi-mcp-adapter/node_modules/a/index.ts": "adapter",
		"playwright-mcp/node_modules/pw/cli.js":  "pw",
	}
	for k, v := range files {
		content[k] = v
	}
	for rel, data := range content {
		path := filepath.Join(src, componentsDir, rel)
		require.NoError(t, os.MkdirAll(filepath.Dir(path), 0o755))
		mode := os.FileMode(0o644)
		if filepath.Base(filepath.Dir(path)) == "bin" {
			mode = 0o755
		}
		require.NoError(t, os.WriteFile(path, []byte(data), mode))
	}
	m := runtimemanifest.Manifest{
		Contract: runtimemanifest.Contract,
		Components: map[string]runtimemanifest.Component{
			"daemon":         {Version: "1", Bin: map[string]runtimemanifest.Bin{"devbox-daemon": {Path: "bin/devbox-daemon"}}},
			"node":           {Version: "24", Private: true, Bin: map[string]runtimemanifest.Bin{"node": {Path: "bin/node"}}},
			"claude":         {Version: "2", Bin: map[string]runtimemanifest.Bin{"claude": {Path: "bin/claude"}}},
			"claude-acp":     {Version: "0.7", Requires: []string{"node"}, Bin: map[string]runtimemanifest.Bin{"claude-agent-acp": {Path: "index.mjs", Interpreter: "node"}}},
			"pi":             {Version: "0.8", Requires: []string{"node"}, Bin: map[string]runtimemanifest.Bin{"pi": {Path: "node_modules/pi/cli.js", Interpreter: "node"}}},
			"pi-mcp-adapter": {Version: "2"},
			"playwright-mcp": {Version: "0.0.1", Requires: []string{"node"}, Bin: map[string]runtimemanifest.Bin{"playwright-mcp": {Path: "node_modules/pw/cli.js", Interpreter: "node"}}},
		},
		Agents: map[string]runtimemanifest.Agent{
			"claude": {Tool: runtimemanifest.Tool{Component: "claude", Command: "claude"},
				ACP: runtimemanifest.Tool{Component: "claude-acp", Command: "claude-agent-acp"}},
			"pi": {Tool: runtimemanifest.Tool{Component: "pi", Command: "pi"}, ACP: runtimemanifest.Tool{Component: "pi", Command: "pi"},
				Components: []string{"pi-mcp-adapter"}},
		},
		PlaywrightMCP: &runtimemanifest.Tool{Component: "playwright-mcp", Command: "playwright-mcp"},
	}
	for name, c := range m.Components {
		hash, err := runtimemanifest.HashDir(filepath.Join(src, componentsDir, name))
		require.NoError(t, err)
		c.Hash = hash
		m.Components[name] = c
	}
	require.NoError(t, m.Validate())
	data, err := json.Marshal(m)
	require.NoError(t, err)
	require.NoError(t, os.WriteFile(filepath.Join(src, runtimemanifest.FileName), data, 0o644))
	return src
}

func read(t *testing.T, path string) string {
	t.Helper()
	data, err := os.ReadFile(path)
	require.NoError(t, err)
	return string(data)
}

func names(t *testing.T, dir string) []string {
	t.Helper()
	entries, err := os.ReadDir(dir)
	require.NoError(t, err)
	var out []string
	for _, e := range entries {
		out = append(out, e.Name())
	}
	return out
}

func installed(t *testing.T, dst, dir string) *runtimemanifest.Manifest {
	t.Helper()
	m, err := runtimemanifest.Load(filepath.Join(dst, dir, runtimemanifest.FileName))
	require.NoError(t, err)
	return m
}

func TestInstallFresh(t *testing.T) {
	src, dst := payload(t, "daemon-a", nil), filepath.Join(t.TempDir(), ".plural-runtime")

	res, err := install(src, dst, digestA, []string{"claude"}, false, testShell)
	require.NoError(t, err)
	assert.Equal(t, "installed", res.Action)
	assert.Equal(t, filepath.Join(dst, dirA), res.Dir)
	assert.Equal(t, []string{"claude", "claude-acp", "daemon", "node"}, res.Components)
	assert.ElementsMatch(t, res.Components, res.Copied)
	assert.Empty(t, res.Missing)

	runtime := filepath.Join(dst, dirA)
	assert.Equal(t, "daemon-a", read(t, filepath.Join(runtime, "bin", "devbox-daemon")))
	assert.ElementsMatch(t, []string{"devbox-daemon", "claude", "claude-agent-acp"}, names(t, filepath.Join(runtime, "bin")),
		"node is private and pi wasn't asked for")
	info, err := os.Lstat(filepath.Join(runtime, "bin", "claude"))
	require.NoError(t, err)
	assert.Equal(t, os.ModeSymlink, info.Mode().Type())
	info, err = os.Stat(filepath.Join(runtime, "bin", "claude-agent-acp"))
	require.NoError(t, err)
	assert.Equal(t, os.FileMode(0o755), info.Mode().Perm())
	assert.Equal(t, idA+"\n", read(t, filepath.Join(dst, readyMarker)))

	m := installed(t, dst, dirA)
	assert.ElementsMatch(t, []string{"claude", "claude-acp", "daemon", "node"}, slices.Collect(maps.Keys(m.Components)))
	assert.Equal(t, []string{"claude"}, slices.Collect(maps.Keys(m.Agents)))
	assert.Nil(t, m.PlaywrightMCP)
	assert.Equal(t, "../components/"+runtimemanifest.DirName("node", m.Components["node"]), m.Components["node"].Dir)
}

// The commands run from wherever the home is mounted: links and launchers are relative.
func TestInstallCommandsRun(t *testing.T) {
	src, dst := payload(t, "daemon-a", nil), filepath.Join(t.TempDir(), ".plural-runtime")
	_, err := install(src, dst, digestA, []string{"claude"}, false, testShell)
	require.NoError(t, err)
	moved := filepath.Join(t.TempDir(), "elsewhere")
	require.NoError(t, os.Rename(dst, moved))
	bin := filepath.Join(moved, dirA, "bin")

	out, err := exec.Command(filepath.Join(bin, "claude")).CombinedOutput()
	require.NoError(t, err, string(out))
	assert.Equal(t, "claude\n", string(out))

	// The fake node prints the script it got: claude-acp's, by a path relative to the launcher.
	out, err = exec.Command(filepath.Join(bin, "claude-agent-acp"), "--flag").CombinedOutput()
	require.NoError(t, err, string(out))
	m := installed(t, moved, dirA)
	script := bin + "/../../" + componentsDir + "/" + runtimemanifest.DirName("claude-acp", m.Components["claude-acp"]) + "/index.mjs"
	assert.Equal(t, "node "+script+" --flag\n", string(out))
}

func TestInstallSelectsAgentsAndBrowser(t *testing.T) {
	src, dst := payload(t, "daemon-a", nil), t.TempDir()

	res, err := install(src, dst, digestA, []string{"pi", "gemini"}, true, testShell)
	require.NoError(t, err)
	assert.Equal(t, []string{"daemon", "node", "pi", "pi-mcp-adapter", "playwright-mcp"}, res.Components)
	assert.Equal(t, []string{"gemini"}, res.Missing)
	piID := runtimemanifest.InstallID(digestA, []string{"gemini", "pi"}, true, testShell)
	assert.Equal(t, piID, res.ID)
	m := installed(t, dst, runtimemanifest.InstallDirName(piID))
	assert.Equal(t, []string{"pi"}, slices.Collect(maps.Keys(m.Agents)))
	require.NotNil(t, m.PlaywrightMCP)
	assert.Equal(t, piID+"\n", read(t, filepath.Join(dst, readyMarker)))

	// The same image for other agents is another install: the devbox container of a template rendered for them
	// waits for their marker instead of starting from the pi install while it is replaced.
	res, err = install(src, dst, digestA, []string{"gemini"}, false, testShell)
	require.NoError(t, err)
	assert.Equal(t, []string{"daemon"}, res.Components)
	assert.NotEqual(t, piID, res.ID)
	assert.Equal(t, res.ID+"\n", read(t, filepath.Join(dst, readyMarker)))
	assert.ElementsMatch(t, []string{runtimemanifest.InstallDirName(res.ID), readyMarker, componentsDir}, names(t, dst))
	assert.Len(t, names(t, filepath.Join(dst, componentsDir)), 1, "the other components were pruned")
}

// A matching install must not be touched: the devbox container may be executing it.
func TestInstallKeepsMatchingRuntime(t *testing.T) {
	src, dst := payload(t, "daemon-a", nil), t.TempDir()
	_, err := install(src, dst, digestA, []string{"claude"}, false, testShell)
	require.NoError(t, err)
	bin := filepath.Join(dst, dirA, "bin", "devbox-daemon")
	before, err := os.Stat(bin)
	require.NoError(t, err)
	marker, err := os.Stat(filepath.Join(dst, readyMarker))
	require.NoError(t, err)

	res, err := install(src, dst, digestA, []string{"claude"}, false, testShell)
	require.NoError(t, err)
	assert.Equal(t, "kept", res.Action)
	assert.Empty(t, res.Copied)
	assert.Zero(t, res.Bytes)

	after, err := os.Stat(bin)
	require.NoError(t, err)
	assert.True(t, os.SameFile(before, after), "the installed binary was replaced")
	markerAfter, err := os.Stat(filepath.Join(dst, readyMarker))
	require.NoError(t, err)
	assert.True(t, os.SameFile(marker, markerAfter), "the marker was rewritten")
}

// An update copies only the components that changed, and prunes the previous runtime and components.
func TestInstallUpdateCopiesChangedComponents(t *testing.T) {
	dst := t.TempDir()
	_, err := install(payload(t, "daemon-a", nil), dst, digestA, []string{"claude"}, false, testShell)
	require.NoError(t, err)
	claude := installed(t, dst, dirA).Components["claude"]
	before, err := os.Stat(filepath.Join(dst, componentsDir, runtimemanifest.DirName("claude", claude), "bin", "claude"))
	require.NoError(t, err)
	require.NoError(t, os.MkdirAll(filepath.Join(dst, "sha256-cccc.tmp"), 0o755))

	res, err := install(payload(t, "daemon-b", nil), dst, digestB, []string{"claude"}, false, testShell)
	require.NoError(t, err)
	assert.Equal(t, "installed", res.Action)
	assert.Equal(t, []string{"daemon"}, res.Copied)
	assert.Equal(t, int64(len("daemon-b")), res.Bytes)
	assert.Contains(t, res.Removed, dirA)
	assert.Contains(t, res.Removed, "sha256-cccc.tmp")

	assert.ElementsMatch(t, []string{dirB, readyMarker, componentsDir}, names(t, dst))
	assert.Len(t, names(t, filepath.Join(dst, componentsDir)), 4, "the old daemon was pruned")
	assert.Equal(t, "daemon-b", read(t, filepath.Join(dst, dirB, "bin", "devbox-daemon")))
	after, err := os.Stat(filepath.Join(dst, componentsDir, runtimemanifest.DirName("claude", claude), "bin", "claude"))
	require.NoError(t, err)
	assert.True(t, os.SameFile(before, after), "the unchanged claude component was copied again")
	assert.Equal(t, idB+"\n", read(t, filepath.Join(dst, readyMarker)))
}

func TestInstallReplacesTamperedRuntime(t *testing.T) {
	src := payload(t, "daemon-a", nil)
	for name, tc := range map[string]struct {
		path   func(dst string) string
		tamper func(t *testing.T, path string)
	}{
		"daemon content": {daemonPath, func(t *testing.T, p string) { require.NoError(t, os.WriteFile(p, []byte("evil-a!!"), 0o755)) }},
		"daemon mode":    {daemonPath, func(t *testing.T, p string) { require.NoError(t, os.Chmod(p, 0o644)) }},
		"daemon missing": {daemonPath, func(t *testing.T, p string) { require.NoError(t, os.Remove(p)) }},
		"daemon symlink": {daemonPath, func(t *testing.T, p string) {
			require.NoError(t, os.Remove(p))
			other := filepath.Join(t.TempDir(), "other")
			require.NoError(t, os.WriteFile(other, []byte("daemon-a"), 0o755))
			require.NoError(t, os.Symlink(other, p))
		}},
		"agent truncated": {claudePath, func(t *testing.T, p string) { require.NoError(t, os.WriteFile(p, []byte("x"), 0o755)) }},
		"agent dir linked": {func(dst string) string { return filepath.Dir(claudePath(dst)) }, func(t *testing.T, p string) {
			other := t.TempDir()
			require.NoError(t, os.WriteFile(filepath.Join(other, "claude"), []byte("#!/bin/sh\necho claude\n"), 0o755))
			require.NoError(t, os.RemoveAll(p))
			require.NoError(t, os.Symlink(other, p))
		}},
		"command removed": {func(dst string) string { return filepath.Join(dst, dirA, "bin", "claude") },
			func(t *testing.T, p string) { require.NoError(t, os.Remove(p)) }},
		"launcher edited": {func(dst string) string { return filepath.Join(dst, dirA, "bin", "claude-agent-acp") },
			func(t *testing.T, p string) { require.NoError(t, os.WriteFile(p, []byte("#!/bin/sh\nevil\n"), 0o755)) }},
		"runtime dir linked": {func(dst string) string { return filepath.Join(dst, dirA) }, func(t *testing.T, p string) {
			// A copy of the install elsewhere in the home, linked in its place.
			copy := filepath.Join(filepath.Dir(p), "copy")
			require.NoError(t, exec.Command("cp", "-a", p, copy).Run())
			require.NoError(t, os.RemoveAll(p))
			require.NoError(t, os.Symlink("copy", p))
		}},
		"extra command": {func(dst string) string { return filepath.Join(dst, dirA, "bin", "extra") },
			func(t *testing.T, p string) { require.NoError(t, os.WriteFile(p, []byte("x"), 0o755)) }},
	} {
		t.Run(name, func(t *testing.T) {
			dst := t.TempDir()
			_, err := install(src, dst, digestA, []string{"claude"}, false, testShell)
			require.NoError(t, err)
			tc.tamper(t, tc.path(dst))

			res, err := install(src, dst, digestA, []string{"claude"}, false, testShell)
			require.NoError(t, err)
			assert.Equal(t, "installed", res.Action)
			assert.Equal(t, "daemon-a", read(t, daemonPath(dst)))
			info, err := os.Lstat(daemonPath(dst))
			require.NoError(t, err)
			assert.Equal(t, os.FileMode(0o755), info.Mode())
			out, err := exec.Command(filepath.Join(dst, dirA, "bin", "claude")).CombinedOutput()
			require.NoError(t, err, string(out))
			assert.Equal(t, "claude\n", string(out))
			assert.NoFileExists(t, filepath.Join(dst, dirA, "bin", "extra"))
			info, err = os.Lstat(filepath.Join(dst, dirA))
			require.NoError(t, err)
			assert.True(t, info.IsDir(), "the install is a directory, not a link")
			assert.Equal(t, idA+"\n", read(t, filepath.Join(dst, readyMarker)))
		})
	}
}

func daemonPath(dst string) string {
	m, _ := runtimemanifest.Load(filepath.Join(dst, dirA, runtimemanifest.FileName))
	return filepath.Join(dst, componentsDir, runtimemanifest.DirName("daemon", m.Components["daemon"]), "bin", "devbox-daemon")
}

func claudePath(dst string) string {
	m, _ := runtimemanifest.Load(filepath.Join(dst, dirA, runtimemanifest.FileName))
	return filepath.Join(dst, componentsDir, runtimemanifest.DirName("claude", m.Components["claude"]), "bin", "claude")
}

// A failed install never leaves a marker naming the runtime that wasn't installed.
func TestInstallFailureNeverPublishesTheNewRuntime(t *testing.T) {
	dst := t.TempDir()
	_, err := install(payload(t, "daemon-a", nil), dst, digestA, []string{"claude"}, false, testShell)
	require.NoError(t, err)

	src := payload(t, "daemon-b", nil)
	require.NoError(t, os.Symlink("/nonexistent", filepath.Join(src, componentsDir, "daemon", "bin", "link")))
	_, err = install(src, dst, digestB, []string{"claude"}, false, testShell)
	require.Error(t, err)
	marker, _ := os.ReadFile(filepath.Join(dst, readyMarker))
	assert.NotContains(t, string(marker), digestB)
	assert.NoDirExists(t, filepath.Join(dst, dirB))
}

// The install root is on the sandbox user's volume: a link planted there is replaced, not followed.
func TestInstallDoesNotFollowLinks(t *testing.T) {
	for _, linked := range []string{"", componentsDir} {
		t.Run("link at "+filepath.Join(".plural-runtime", linked), func(t *testing.T) {
			home, elsewhere := t.TempDir(), t.TempDir()
			keep := filepath.Join(elsewhere, "keep")
			require.NoError(t, os.WriteFile(keep, []byte("x"), 0o644))
			dst := filepath.Join(home, ".plural-runtime")
			if linked != "" {
				require.NoError(t, os.MkdirAll(dst, 0o755))
			}
			require.NoError(t, os.Symlink(elsewhere, filepath.Join(dst, linked)))

			_, err := install(payload(t, "daemon-a", nil), dst, digestA, []string{"claude"}, false, testShell)
			require.NoError(t, err)
			info, err := os.Lstat(filepath.Join(dst, linked))
			require.NoError(t, err)
			assert.True(t, info.IsDir(), "the link was not replaced by a directory")
			assert.Equal(t, []string{"keep"}, names(t, elsewhere), "something was written or pruned through the link")
			assert.Equal(t, idA+"\n", read(t, filepath.Join(dst, readyMarker)))
		})
	}

	// The same for the temp paths the installer writes to.
	dst := t.TempDir()
	keep := filepath.Join(t.TempDir(), "keep")
	require.NoError(t, os.WriteFile(keep, []byte("x"), 0o644))
	require.NoError(t, os.Symlink(keep, filepath.Join(dst, readyMarker+tmpSuffix)))
	require.NoError(t, os.Symlink(filepath.Dir(keep), filepath.Join(dst, dirA+tmpSuffix)))
	_, err := install(payload(t, "daemon-a", nil), dst, digestA, []string{"claude"}, false, testShell)
	require.NoError(t, err)
	assert.Equal(t, "x", read(t, keep))
	assert.Equal(t, []string{"keep"}, names(t, filepath.Dir(keep)))
}

func TestInstallRejectsBadInput(t *testing.T) {
	for _, digest := range []string{"", "../x", "a/b", ".hidden", "sha256:ab cd", "sha256:a+b"} {
		_, err := install(payload(t, "daemon-a", nil), t.TempDir(), digest, nil, false, testShell)
		assert.Error(t, err, digest)
	}
	for _, shell := range []string{"", "sh", "/bin/sh -e"} {
		_, err := install(payload(t, "daemon-a", nil), t.TempDir(), digestA, nil, false, shell)
		assert.Error(t, err, shell)
	}
}

// The launchers run with the environment image's shell, and another shell is another install.
func TestInstallLaunchersUseTheShell(t *testing.T) {
	const sh = "/usr/local/bin/sh"
	src, dst := payload(t, "daemon-a", nil), t.TempDir()
	res, err := install(src, dst, digestA, []string{"claude"}, false, sh)
	require.NoError(t, err)
	assert.Equal(t, runtimemanifest.InstallID(digestA, []string{"claude"}, false, sh), res.ID)
	assert.NotEqual(t, idA, res.ID)
	data, err := os.ReadFile(filepath.Join(res.Dir, "bin", "claude-agent-acp"))
	require.NoError(t, err)
	assert.Equal(t, "#!"+sh+"\n", string(data[:len(sh)+3]))
}
