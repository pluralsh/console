package daemon

import (
	"context"
	"os"
	"sort"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/agents"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/harness"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/proc"
)

// ImageProbeSpecs are probe specs for every agent the image ships (`devbox-daemon probe`), the first listed as
// default unless def names one.
func ImageProbeSpecs(img *harness.ImageInfo, def string) []*devboxv1.AgentProbeSpec {
	var names []string
	for name := range img.Agents {
		names = append(names, name)
	}
	sort.Strings(names)
	if len(names) == 0 {
		for _, t := range harness.AllAgents {
			names = append(names, harness.AgentName(t))
		}
	}
	var out []*devboxv1.AgentProbeSpec
	for _, name := range names {
		t, ok := harness.ParseAgent(name)
		if !ok {
			continue
		}
		a := img.Agents[name]
		v := a.ACP.Version
		if v == "" {
			v = a.Version
		}
		out = append(out, &devboxv1.AgentProbeSpec{Type: t, AdapterVersion: v, IsDefault: name == def})
	}
	if def == "" && len(out) > 0 {
		out[0].IsDefault = true
	}
	return out
}

// Probe runs the section 4.2a probe outside a running daemon (image builds, `devbox-daemon probe --json`).
func Probe(ctx context.Context, cfg Config, specs []*devboxv1.AgentProbeSpec, ep *devboxv1.HarnessEndpoints) ([]*devboxv1.AgentCatalogEntry, error) {
	cfg.defaults()
	img, err := harness.LoadImageInfo(cfg.ImageInfo)
	if err != nil {
		return nil, err
	}
	if specs == nil {
		specs = ImageProbeSpecs(img, "")
	}
	scratch, err := os.MkdirTemp("", "devbox-probe-")
	if err != nil {
		return nil, err
	}
	defer os.RemoveAll(scratch)
	stateDir, err := os.MkdirTemp("", "devbox-probe-state-")
	if err != nil {
		return nil, err
	}
	defer os.RemoveAll(stateDir)
	h := &harness.Config{Home: cfg.Home, StateDir: stateDir, Image: img, AgentAuthDir: cfg.AgentAuthDir,
		BaseEnv: os.Environ, Overrides: cfg.AgentOverrides}
	sup := proc.NewSupervisor(cfg.Log)
	defer sup.StopAll(context.Background(), 0)
	return agents.Probe(ctx, agents.ProbeOptions{Launcher: h, Supervisor: sup, Log: cfg.Log,
		Present:        func(t devboxv1.AgentType) bool { _, ok := h.Present(t); return ok },
		AdapterVersion: h.AdapterVersion, ScratchDir: scratch, Endpoints: ep}, specs), nil
}
