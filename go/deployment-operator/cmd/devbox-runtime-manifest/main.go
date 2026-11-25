// Command devbox-runtime-manifest writes the manifest of ghcr.io/pluralsh/devbox-runtime-core at image build time.
// It takes the committed component spec (dockerfiles/devbox/runtime/components.json), fills in each component's
// version and content hash, and validates the result, so the image never ships a manifest the installer or the
// daemon would reject.
//
// A spec component's version is "@daemon" or "@node" (from the flags of the same name), or, for one with an npm
// package, the version assemble.sh installed, from its versions file.
package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/runtimemanifest"
)

type spec struct {
	runtimemanifest.Manifest
	Components map[string]specComponent `json:"components"`
}

type specComponent struct {
	runtimemanifest.Component
	// Package is the component's npm package, which assemble.sh installs.
	Package string `json:"package,omitempty"`
}

func main() {
	specPath := flag.String("spec", "", "the component spec (components.json)")
	installed := flag.String("versions", "", `the versions assemble.sh installed ("<component> <version>" lines)`)
	components := flag.String("components", "", "the built components, one directory each")
	daemonVersion := flag.String("daemon", "", "the devbox-daemon version")
	nodeVersion := flag.String("node", "", "the Node version")
	out := flag.String("out", "", "where to write the manifest")
	flag.Parse()

	m, err := build(*specPath, *installed, *components, map[string]string{"@daemon": *daemonVersion, "@node": *nodeVersion})
	if err == nil {
		err = write(*out, m)
	}
	if err != nil {
		fmt.Fprintln(os.Stderr, "devbox-runtime-manifest:", err)
		os.Exit(1)
	}
}

func build(specPath, installedPath, components string, versions map[string]string) (*runtimemanifest.Manifest, error) {
	data, err := os.ReadFile(specPath)
	if err != nil {
		return nil, err
	}
	installed, err := readVersions(installedPath)
	if err != nil {
		return nil, err
	}
	s := spec{}
	if err := json.Unmarshal(data, &s); err != nil {
		return nil, fmt.Errorf("decode %s: %w", specPath, err)
	}
	m := s.Manifest
	m.Components = map[string]runtimemanifest.Component{}
	for name, sc := range s.Components {
		c := sc.Component
		switch {
		case sc.Package != "":
			if c.Version = installed[name]; c.Version == "" {
				return nil, fmt.Errorf("component %s: %s was not installed", name, sc.Package)
			}
		case versions[c.Version] != "":
			c.Version = versions[c.Version]
		default:
			return nil, fmt.Errorf("component %s: no version for %q", name, c.Version)
		}
		if c.Hash, err = runtimemanifest.HashDir(filepath.Join(components, name)); err != nil {
			return nil, fmt.Errorf("component %s: %w", name, err)
		}
		for bin, b := range c.Bin {
			info, err := os.Stat(filepath.Join(components, name, b.Path))
			if err != nil {
				return nil, fmt.Errorf("component %s: command %s: %w", name, bin, err)
			}
			if b.Interpreter == "" && info.Mode()&0o111 == 0 {
				return nil, fmt.Errorf("component %s: command %s (%s) is not executable", name, bin, b.Path)
			}
		}
		m.Components[name] = c
	}
	entries, err := os.ReadDir(components)
	if err != nil {
		return nil, err
	}
	for _, e := range entries {
		if _, ok := m.Components[e.Name()]; !ok {
			return nil, fmt.Errorf("%s is built but not in the spec", e.Name())
		}
	}
	if err := m.Validate(); err != nil {
		return nil, err
	}
	return &m, nil
}

// readVersions reads assemble.sh's "<component> <version>" lines.
func readVersions(path string) (map[string]string, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	out := map[string]string{}
	for _, line := range strings.Split(strings.TrimSpace(string(data)), "\n") {
		name, version, ok := strings.Cut(strings.TrimSpace(line), " ")
		if !ok || name == "" || version == "" {
			return nil, fmt.Errorf("%s: invalid line %q", path, line)
		}
		out[name] = version
	}
	return out, nil
}

func write(path string, m *runtimemanifest.Manifest) error {
	data, err := json.MarshalIndent(m, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, append(data, '\n'), 0o644)
}
