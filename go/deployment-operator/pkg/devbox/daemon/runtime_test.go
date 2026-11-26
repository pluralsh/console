package daemon

import (
	"encoding/json"
	"log/slog"
	"os"
	"path/filepath"
	goruntime "runtime"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/runtimemanifest"
)

// runtimeDir is an installed runtime with claude, and an image.json with gemini.
func runtimeDir(t *testing.T) (cfg Config) {
	t.Helper()
	root := t.TempDir()
	hash := strings.Repeat("ab", 32)
	m := runtimemanifest.Manifest{
		Contract: runtimemanifest.Contract,
		Components: map[string]runtimemanifest.Component{
			"daemon":     {Version: "1", Hash: hash, Dir: "../components/daemon-x"},
			"claude":     {Version: "2", Hash: hash, Dir: "../components/claude-x", Bin: map[string]runtimemanifest.Bin{"claude": {Path: "bin/claude"}}},
			"claude-acp": {Version: "0.7", Hash: hash, Dir: "../components/claude-acp-x", Bin: map[string]runtimemanifest.Bin{"claude-agent-acp": {Path: "index.mjs"}}},
		},
		Agents: map[string]runtimemanifest.Agent{"claude": {Tool: runtimemanifest.Tool{Component: "claude", Command: "claude"},
			ACP: runtimemanifest.Tool{Component: "claude-acp", Command: "claude-agent-acp"}}},
	}
	dir := filepath.Join(root, "home", ".plural-runtime", "sha256-aaaa")
	require.NoError(t, os.MkdirAll(dir, 0o755))
	data, err := json.Marshal(m)
	require.NoError(t, err)
	require.NoError(t, os.WriteFile(filepath.Join(dir, runtimemanifest.FileName), data, 0o644))
	image := filepath.Join(root, "image.json")
	require.NoError(t, os.WriteFile(image, []byte(`{"agents":{"gemini":{"command":"gemini"},"claude":{"command":"claude"}}}`), 0o644))

	loader := filepath.Join(root, "sysroot", glibcLoaders[goruntime.GOARCH])
	require.NoError(t, os.MkdirAll(filepath.Dir(loader), 0o755))
	require.NoError(t, os.WriteFile(loader, nil, 0o755))
	return Config{ImageInfo: image, RuntimeDir: dir, LoaderRoot: filepath.Join(root, "sysroot"), Log: slog.New(slog.DiscardHandler)}
}

func TestLoadImageUsesTheRuntime(t *testing.T) {
	cfg := runtimeDir(t)
	t.Setenv("PATH", "/usr/bin:"+filepath.Join(cfg.RuntimeDir, "bin")+":/bin")

	img, err := LoadImage(cfg)
	require.NoError(t, err)
	assert.Empty(t, img.RuntimeUnavailable)
	assert.Equal(t, filepath.Join(cfg.RuntimeDir, "bin", "claude-agent-acp"), img.Agents["claude"].ACP.Command)
	assert.Equal(t, "gemini", img.Agents["gemini"].Command, "the image's other agents stay")
	assert.Equal(t, filepath.Join(cfg.RuntimeDir, "bin")+":/usr/bin:/bin", os.Getenv("PATH"), "the runtime's commands come first, once")
}

func TestLoadImageWithoutGlibc(t *testing.T) {
	cfg := runtimeDir(t)
	cfg.LoaderRoot = t.TempDir()
	t.Setenv("PATH", "/usr/bin")

	img, err := LoadImage(cfg)
	require.NoError(t, err)
	assert.Contains(t, img.RuntimeUnavailable, "glibc 2.28")
	assert.Equal(t, "claude", img.Agents["claude"].Command, "the image's agents are kept")
	assert.Equal(t, "/usr/bin", os.Getenv("PATH"))
}

// Playwright MCP runs on the runtime's Node too, so a browser-only runtime needs glibc as well.
func TestLoadImageWithoutGlibcBrowserOnly(t *testing.T) {
	cfg := runtimeDir(t)
	cfg.LoaderRoot = t.TempDir()
	hash := strings.Repeat("ab", 32)
	m := runtimemanifest.Manifest{Contract: runtimemanifest.Contract, Components: map[string]runtimemanifest.Component{
		"daemon":         {Version: "1", Hash: hash},
		"playwright-mcp": {Version: "0.0.85", Hash: hash, Bin: map[string]runtimemanifest.Bin{"playwright-mcp": {Path: "cli.js"}}},
	}, PlaywrightMCP: &runtimemanifest.Tool{Component: "playwright-mcp", Command: "playwright-mcp"}}
	data, err := json.Marshal(m)
	require.NoError(t, err)
	require.NoError(t, os.WriteFile(filepath.Join(cfg.RuntimeDir, runtimemanifest.FileName), data, 0o644))

	img, err := LoadImage(cfg)
	require.NoError(t, err)
	assert.Contains(t, img.RuntimeUnavailable, "glibc")
	assert.Empty(t, img.PlaywrightMCP)
}

func TestLoadImageWithoutARuntime(t *testing.T) {
	cfg := runtimeDir(t)
	require.NoError(t, os.Remove(filepath.Join(cfg.RuntimeDir, runtimemanifest.FileName)))
	img, err := LoadImage(cfg)
	require.NoError(t, err)
	assert.Contains(t, img.RuntimeUnavailable, "manifest")

	cfg.RuntimeDir = ""
	img, err = LoadImage(cfg)
	require.NoError(t, err)
	assert.Empty(t, img.RuntimeUnavailable, "an environment image without the sidecar uses its own agents")
}
