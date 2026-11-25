// Package runtimemanifest describes what ghcr.io/pluralsh/devbox-runtime-core carries: its components (the daemon,
// Node and the agent tools, one directory each) and the agents they make up. The image build writes the manifest
// (cmd/devbox-runtime-manifest), devbox-runtime-installer installs the components a runner uses from it, and
// devbox-daemon reads the installed copy to find the agents.
package runtimemanifest

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"io/fs"
	"os"
	"path/filepath"
	"slices"
	"strings"
)

const (
	// FileName is the manifest's name, in the payload root and in an installed runtime's directory.
	FileName = "manifest.json"
	// Contract is the manifest version this package reads and writes.
	Contract = "v1"
	// Daemon is the component that holds devbox-daemon. Every install has it.
	Daemon = "daemon"
	// BinDir is the installed runtime's directory of commands, relative to it.
	BinDir = "bin"
)

// Manifest is manifest.json.
type Manifest struct {
	Contract   string               `json:"contract"`
	Components map[string]Component `json:"components"`
	// Agents are the coding agents, keyed by their name in DevboxRunner spec.agents (claude, codex, ...).
	Agents map[string]Agent `json:"agents,omitempty"`
	// PlaywrightMCP is the Playwright MCP server, installed for runners with the browser enabled.
	PlaywrightMCP *Tool `json:"playwrightMcp,omitempty"`
}

// Component is one directory of the payload, installed as a whole.
type Component struct {
	Version string `json:"version"`
	// Hash is the sha256 of the component's files (HashDir). An installed component's directory is named after
	// it, so a runtime update copies only the components that changed.
	Hash string `json:"hash"`
	// Requires are the components this one runs with, installed alongside it.
	Requires []string `json:"requires,omitempty"`
	// Bin are the commands the component provides, installed into the runtime's bin directory.
	Bin map[string]Bin `json:"bin,omitempty"`
	// Private keeps the component's commands out of the bin directory, which the daemon puts first on PATH: Node
	// only runs the other components, and must not shadow the Node a repository uses.
	Private bool `json:"private,omitempty"`
	// Dir is where the component is installed, relative to the installed runtime's directory. Only set in an
	// installed runtime's manifest.
	Dir string `json:"dir,omitempty"`
}

// Bin is one command of a component.
type Bin struct {
	// Path is the executable or script, relative to the component's directory.
	Path string `json:"path"`
	// Interpreter is a command of a required component that runs Path (node for a script). Empty: Path is
	// executable.
	Interpreter string `json:"interpreter,omitempty"`
}

// Tool is a command one component provides.
type Tool struct {
	Component string   `json:"component"`
	Command   string   `json:"command"`
	Args      []string `json:"args,omitempty"`
}

// Agent is a coding agent: its CLI and the command that speaks ACP for it, which may be the CLI itself.
type Agent struct {
	Tool
	ACP Tool `json:"acp"`
	// Env is set for the agent's ACP process. Values may name ${bin} (the runtime's bin directory) and
	// ${component:<name>} (a component's directory).
	Env map[string]string `json:"env,omitempty"`
	// Components are other components the agent needs that neither tool requires (extensions).
	Components []string `json:"components,omitempty"`
}

// Load reads and validates a manifest.
func Load(path string) (*Manifest, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	m := &Manifest{}
	if err := json.Unmarshal(data, m); err != nil {
		return nil, fmt.Errorf("decode %s: %w", path, err)
	}
	if err := m.Validate(); err != nil {
		return nil, fmt.Errorf("%s: %w", path, err)
	}
	return m, nil
}

// Validate checks that the manifest is one this package understands and that every name it uses is safe to
// join to a directory and refers to a component it has.
func (m *Manifest) Validate() error {
	if m.Contract != Contract {
		return fmt.Errorf("unsupported runtime manifest contract %q", m.Contract)
	}
	if _, ok := m.Components[Daemon]; !ok {
		return fmt.Errorf("no %s component", Daemon)
	}
	known := func(name string) error {
		if _, ok := m.Components[name]; !ok {
			return fmt.Errorf("unknown component %q", name)
		}
		return nil
	}
	commands := map[string]string{}
	for name, c := range m.Components {
		if !validName(name) {
			return fmt.Errorf("invalid component name %q", name)
		}
		if len(c.Hash) != sha256.Size*2 || strings.Trim(c.Hash, "0123456789abcdef") != "" {
			return fmt.Errorf("component %s: invalid hash %q", name, c.Hash)
		}
		for _, r := range c.Requires {
			if err := known(r); err != nil {
				return fmt.Errorf("component %s: %w", name, err)
			}
		}
		for bin, b := range c.Bin {
			if !validName(bin) || !validPath(b.Path) {
				return fmt.Errorf("component %s: invalid command %q (%q)", name, bin, b.Path)
			}
			// The bin directory holds one command per name.
			if other, ok := commands[bin]; ok && !c.Private {
				return fmt.Errorf("components %s and %s both provide the command %s", other, name, bin)
			}
			if !c.Private {
				commands[bin] = name
			}
			if b.Interpreter != "" {
				if _, _, ok := m.Interpreter(c, b); !ok {
					return fmt.Errorf("component %s: command %s runs with %q, which no required component provides", name, bin, b.Interpreter)
				}
			}
		}
	}
	tool := func(t Tool) error {
		if err := known(t.Component); err != nil {
			return err
		}
		if _, ok := m.Components[t.Component].Bin[t.Command]; !ok {
			return fmt.Errorf("component %s has no command %q", t.Component, t.Command)
		}
		return nil
	}
	for name, a := range m.Agents {
		if err := tool(a.Tool); err != nil {
			return fmt.Errorf("agent %s: %w", name, err)
		}
		if err := tool(a.ACP); err != nil {
			return fmt.Errorf("agent %s: acp: %w", name, err)
		}
		for _, c := range a.Components {
			if err := known(c); err != nil {
				return fmt.Errorf("agent %s: %w", name, err)
			}
		}
	}
	if m.PlaywrightMCP != nil {
		if err := tool(*m.PlaywrightMCP); err != nil {
			return fmt.Errorf("playwrightMcp: %w", err)
		}
	}
	return nil
}

// Interpreter finds the component and command that run b, a command of c.
func (m *Manifest) Interpreter(c Component, b Bin) (string, Bin, bool) {
	for _, r := range c.Requires {
		if ib, ok := m.Components[r].Bin[b.Interpreter]; ok && ib.Interpreter == "" {
			return r, ib, true
		}
	}
	return "", Bin{}, false
}

// Select returns the components a runner with these agents (and the browser, if enabled) installs, the daemon
// and every requirement included, sorted. Agents the manifest doesn't carry are returned as missing.
func (m *Manifest) Select(agents []string, browser bool) (components, missing []string) {
	set := map[string]bool{}
	var add func(string)
	add = func(name string) {
		if set[name] {
			return
		}
		set[name] = true
		for _, r := range m.Components[name].Requires {
			add(r)
		}
	}
	add(Daemon)
	for _, name := range agents {
		a, ok := m.Agents[name]
		if !ok {
			missing = append(missing, name)
			continue
		}
		add(a.Component)
		add(a.ACP.Component)
		for _, c := range a.Components {
			add(c)
		}
	}
	if browser && m.PlaywrightMCP != nil {
		add(m.PlaywrightMCP.Component)
	}
	for name := range set {
		components = append(components, name)
	}
	slices.Sort(components)
	return components, missing
}

// Installed is the manifest of an installed runtime: only its components, each with its directory, and only
// the agents (and Playwright MCP) whose components are all there.
func (m *Manifest) Installed(components []string, dir func(name string) string) *Manifest {
	out := &Manifest{Contract: m.Contract, Components: map[string]Component{}}
	for _, name := range components {
		c := m.Components[name]
		c.Dir = dir(name)
		out.Components[name] = c
	}
	has := func(names ...string) bool {
		for _, n := range names {
			if _, ok := out.Components[n]; !ok {
				return false
			}
		}
		return true
	}
	for name, a := range m.Agents {
		if has(append([]string{a.Component, a.ACP.Component}, a.Components...)...) {
			if out.Agents == nil {
				out.Agents = map[string]Agent{}
			}
			out.Agents[name] = a
		}
	}
	if m.PlaywrightMCP != nil && has(m.PlaywrightMCP.Component) {
		out.PlaywrightMCP = m.PlaywrightMCP
	}
	return out
}

// DirName is the directory a component is installed into, under the install root's components directory.
func DirName(name string, c Component) string {
	return name + "-" + c.Hash[:16]
}

// Expand replaces ${bin} and ${component:<name>} in an agent's env value, for a runtime installed in dir.
func (m *Manifest) Expand(dir, value string) string {
	value = strings.ReplaceAll(value, "${bin}", filepath.Join(dir, BinDir))
	for name, c := range m.Components {
		value = strings.ReplaceAll(value, "${component:"+name+"}", filepath.Join(dir, c.Dir))
	}
	return value
}

// HashDir is the sha256 of every regular file under dir: its path, whether it is executable and its content.
// Anything else than a regular file or a directory is an error.
func HashDir(dir string) (string, error) {
	h := sha256.New()
	err := filepath.WalkDir(dir, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() {
			return nil
		}
		if !d.Type().IsRegular() {
			return fmt.Errorf("%s is not a regular file", path)
		}
		rel, err := filepath.Rel(dir, path)
		if err != nil {
			return err
		}
		info, err := d.Info()
		if err != nil {
			return err
		}
		sum, err := fileSum(path)
		if err != nil {
			return err
		}
		fmt.Fprintf(h, "%s\x00%t\x00%s\n", filepath.ToSlash(rel), info.Mode()&0o111 != 0, sum)
		return nil
	})
	if err != nil {
		return "", err
	}
	return hex.EncodeToString(h.Sum(nil)), nil
}

func fileSum(path string) (string, error) {
	f, err := os.Open(path)
	if err != nil {
		return "", err
	}
	defer f.Close()
	h := sha256.New()
	if _, err := io.Copy(h, f); err != nil {
		return "", err
	}
	return hex.EncodeToString(h.Sum(nil)), nil
}

func validName(s string) bool {
	return s != "" && strings.Trim(s, "abcdefghijklmnopqrstuvwxyz0123456789-_.") == "" && !strings.HasPrefix(s, ".")
}

// validPath is a relative path that stays inside the directory it is joined to, made of characters that need no
// quoting in the installer's sh launchers.
func validPath(p string) bool {
	return p != "" && filepath.IsLocal(p) && p == filepath.Clean(p) &&
		strings.Trim(p, "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789._/@+-") == ""
}

// InstallID names one install of a runtime: its image digest and the agents (and browser) it was installed
// for, since the same image installs other components for other agents. The ready marker holds it, and the
// devbox container execs the daemon only once the marker names the ID its template was rendered with, so it
// never starts from a runtime that is still being changed for another selection.
func InstallID(digest string, agents []string, browser bool) string {
	sorted := slices.Clone(agents)
	slices.Sort(sorted)
	sum := sha256.Sum256(fmt.Appendf(nil, "agents=%s\nbrowser=%t\n", strings.Join(slices.Compact(sorted), ","), browser))
	return digest + "+" + hex.EncodeToString(sum[:6])
}

// InstallDirName is the directory an install ID's runtime is installed into, under the install root
// ("sha256:abc+0123" becomes "sha256-abc-0123").
func InstallDirName(id string) string {
	return strings.NewReplacer(":", "-", "+", "-").Replace(id)
}
