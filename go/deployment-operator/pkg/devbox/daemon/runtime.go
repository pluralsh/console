package daemon

import (
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	goruntime "runtime"
	"strings"

	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/harness"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/runtimemanifest"
)

// RuntimeRequirements documents what the environment image needs for the runtime's agents.
const RuntimeRequirements = "https://docs.plural.sh/plural-features/devboxes/environment-images#requirements"

// glibcLoaders are the dynamic loaders the runtime's agents (official Node and the agent binaries, all linked
// against glibc) need, per architecture.
var glibcLoaders = map[string]string{
	"amd64": "/lib64/ld-linux-x86-64.so.2",
	"arm64": "/lib/ld-linux-aarch64.so.1",
}

// LoadImage reads the image description (cfg.ImageInfo) and merges in the agents the runtime sidecar installed
// in cfg.RuntimeDir, which win over the image's. Their commands are put first on PATH, for the daemon's own
// lookups and every child (login shells reset PATH; the images' devbox.sh puts them back in terminals). A runtime that can't be used here (no manifest, or no glibc in
// the environment image) leaves the image's agents and says why in RuntimeUnavailable, which the probe reports.
func LoadImage(cfg Config) (*harness.ImageInfo, error) {
	img, err := harness.LoadImageInfo(cfg.ImageInfo)
	if err != nil || cfg.RuntimeDir == "" {
		return img, err
	}
	log := cfg.Log
	if log == nil {
		log = slog.Default()
	}
	log = log.With("component", "runtime", "dir", cfg.RuntimeDir)
	m, err := runtimemanifest.Load(filepath.Join(cfg.RuntimeDir, runtimemanifest.FileName))
	if err != nil {
		img.RuntimeUnavailable = fmt.Sprintf("the runtime's manifest can't be read: %s", err)
		log.Error("the runtime's agents are unavailable", "err", err)
		return img, nil
	}
	if loader := glibcLoaders[goruntime.GOARCH]; (len(m.Agents) > 0 || m.PlaywrightMCP != nil) && !exists(cfg.LoaderRoot, loader) {
		img.RuntimeUnavailable = fmt.Sprintf("the environment image has no glibc (%s is missing); the runtime's agents need glibc 2.28 or newer, see %s", loader, RuntimeRequirements)
		log.Error("the runtime's agents are unavailable", "reason", img.RuntimeUnavailable)
		return img, nil
	}
	img.MergeRuntime(cfg.RuntimeDir, m)
	bin := filepath.Join(cfg.RuntimeDir, runtimemanifest.BinDir)
	if err := os.Setenv("PATH", prependPath(bin, os.Getenv("PATH"))); err != nil {
		return nil, err
	}
	log.Info("using the runtime's agents", "agents", len(m.Agents), "playwrightMcp", m.PlaywrightMCP != nil)
	return img, nil
}

func exists(root, path string) bool {
	_, err := os.Stat(filepath.Join(root, path))
	return err == nil
}

// prependPath puts dir first on the PATH list path, once.
func prependPath(dir, path string) string {
	parts := []string{dir}
	for _, p := range filepath.SplitList(path) {
		if p != dir && p != "" {
			parts = append(parts, p)
		}
	}
	return strings.Join(parts, string(os.PathListSeparator))
}
