package agents

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"time"

	"google.golang.org/protobuf/types/known/timestamppb"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/harness"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/proc"
)

// ProbeTimeout bounds one agent's probe.
const ProbeTimeout = 90 * time.Second

// probeCommandWait is how long the probe waits for the first available_commands_update after session/new.
const probeCommandWait = 3 * time.Second

// ProbeOptions configure Probe.
type ProbeOptions struct {
	Launcher   Launcher
	Supervisor *proc.Supervisor
	Log        *slog.Logger
	// Present reports whether an agent's ACP command exists (nil: always).
	Present func(devboxv1.AgentType) bool
	// MissingReason explains why agents may be missing (the runtime's agents can't run in this image).
	MissingReason string
	// AdapterVersion is the image's pinned adapter version.
	AdapterVersion func(devboxv1.AgentType) string
	// ScratchDir is where probe sessions run.
	ScratchDir string
	Endpoints  *devboxv1.HarnessEndpoints
}

// Probe starts each agent with its golden-boot configuration, opens a scratch session and reports the agent's
// capabilities, models, config options and initial slash commands (section 4.2a).
func Probe(ctx context.Context, opts ProbeOptions, specs []*devboxv1.AgentProbeSpec) []*devboxv1.AgentCatalogEntry {
	out := make([]*devboxv1.AgentCatalogEntry, 0, len(specs))
	for _, spec := range specs {
		out = append(out, probeOne(ctx, opts, spec))
	}
	return out
}

func probeOne(ctx context.Context, opts ProbeOptions, spec *devboxv1.AgentProbeSpec) *devboxv1.AgentCatalogEntry {
	entry := &devboxv1.AgentCatalogEntry{
		Type: spec.GetType(), IsDefault: spec.GetIsDefault(), AdapterVersion: spec.GetAdapterVersion(),
		DefaultModel: spec.GetDefaultModel(), ProbedAt: timestamppb.Now(),
	}
	if entry.AdapterVersion == "" && opts.AdapterVersion != nil {
		entry.AdapterVersion = opts.AdapterVersion(spec.GetType())
	}
	if opts.Present != nil && !opts.Present(spec.GetType()) {
		entry.ProbeStatus = devboxv1.ProbeStatus_PROBE_STATUS_MISSING
		entry.ProbeError = fmt.Sprintf("%s is not installed in the runtime or the image", harness.AgentName(spec.GetType()))
		if opts.MissingReason != "" {
			entry.ProbeError += ": " + opts.MissingReason
		}
		return entry
	}
	fail := func(err error) *devboxv1.AgentCatalogEntry {
		entry.ProbeStatus = devboxv1.ProbeStatus_PROBE_STATUS_FAILED
		entry.ProbeError = err.Error()
		return entry
	}
	dir := filepath.Join(opts.ScratchDir, harness.AgentName(spec.GetType()))
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return fail(err)
	}
	defer os.RemoveAll(dir)

	ctx, cancel := context.WithTimeout(ctx, ProbeTimeout)
	defer cancel()
	pm := New(Options{
		Home: dir, Launcher: opts.Launcher, Supervisor: opts.Supervisor, Log: opts.Log,
		Endpoints: func() *devboxv1.HarnessEndpoints { return opts.Endpoints },
	})
	defer pm.Stop(context.Background())
	launch := &devboxv1.AgentLaunch{Agent: spec.GetType(), Billing: devboxv1.BillingMode_BILLING_MODE_PROXY, AcpV2: spec.GetAcpV2()}
	pm.Configure("probe", spec.GetType(), "", nil, []*devboxv1.AgentLaunch{launch}, 1)
	// The catalog lists every level the agent supports; console narrows it to each runner's cap.
	pm.SetAutonomy(&devboxv1.AutonomyPolicy{Default: devboxv1.Autonomy_AUTONOMY_MANUAL, Max: devboxv1.Autonomy_AUTONOMY_FULL})
	pm.probe = true
	row, err := pm.CreateThread(ctx, &devboxv1.CreateThreadRequest{ThreadId: "probe", Agent: spec.GetType(), Cwd: dir})
	if err != nil {
		return fail(err)
	}
	deadline := time.Now().Add(probeCommandWait)
	for time.Now().Before(deadline) && len(row.GetAvailableCommands()) == 0 {
		time.Sleep(100 * time.Millisecond)
		pm.mu.Lock()
		if t := pm.threads["probe"]; t != nil {
			row = pm.threadRowLocked(t)
		}
		pm.mu.Unlock()
	}
	conns := pm.Connections()
	if len(conns) > 0 {
		c := conns[0]
		entry.AdapterName = c.GetAdapterName()
		if c.GetAdapterVersion() != "" {
			entry.AdapterVersion = c.GetAdapterVersion()
		}
		entry.ProtocolVersion = c.GetProtocolVersion()
		entry.Capabilities = c.GetCapabilities()
	}
	entry.ConfigOptions = row.GetConfigOptions()
	entry.InitialCommands = row.GetAvailableCommands()
	for _, o := range entry.ConfigOptions {
		if o.GetCategory() != modelCategory {
			continue
		}
		entry.ModelSwitchable = true
		entry.ModelConfigOptionId = o.GetId()
		entry.CurrentModel = o.GetCurrentValue()
		entry.Models = o.GetOptions()
		break
	}
	entry.ProbeStatus = devboxv1.ProbeStatus_PROBE_STATUS_OK
	return entry
}
