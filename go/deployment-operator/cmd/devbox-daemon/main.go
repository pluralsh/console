// devbox-daemon is PID 1 in every Plural DevBox sandbox (image ENTRYPOINT). It serves devbox.v1.Daemon (gRPC over
// h2c) and the sandbox HTTP endpoints on one port.
//
//	devbox-daemon [flags]                 run the daemon
//	devbox-daemon probe [--json] [flags]  probe the image's agents (section 4.2a) and print the catalog
//	devbox-daemon -version                print the version
package main

import (
	"context"
	"flag"
	"fmt"
	"io"
	"log/slog"
	"os"
	"os/signal"
	"path/filepath"
	"strconv"
	"strings"
	"syscall"
	"time"

	"google.golang.org/protobuf/encoding/protojson"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/agents"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/harness"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/trust"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/guest"
)

// version is set with -ldflags "-X main.version=...".
var version = "dev"

func main() {
	args := os.Args[1:]
	if len(args) > 0 && args[0] == "probe" {
		os.Exit(runProbe(args[1:], os.Stdout, os.Stderr))
	}
	os.Exit(run(args))
}

func env(k, def string) string {
	if v, ok := os.LookupEnv(k); ok && v != "" {
		return v
	}
	return def
}

func envInt(k string, def int) int {
	if v, err := strconv.Atoi(os.Getenv(k)); err == nil {
		return v
	}
	return def
}

func envBool(k string) bool {
	v, _ := strconv.ParseBool(os.Getenv(k))
	return v
}

func envDuration(k string, def time.Duration) time.Duration {
	if v, err := time.ParseDuration(os.Getenv(k)); err == nil {
		return v
	}
	return def
}

type options struct {
	cfg       daemon.Config
	egressCA  string
	logLevel  string
	logFormat string
	version   bool
}

func register(fs *flag.FlagSet) *options {
	o := &options{}
	home := env("DEVBOX_HOME", env("HOME", "/home/dev"))
	c := &o.cfg
	fs.StringVar(&c.ListenAddr, "listen", env("DEVBOX_LISTEN_ADDR", ":80"), "gRPC (h2c) and HTTP listen address")
	fs.StringVar(&c.Home, "home", home, "dev user's home directory (workspace volume)")
	fs.StringVar(&c.StateDir, "state-dir", env("DEVBOX_STATE_DIR", filepath.Join(home, ".plural")), "daemon state and event log")
	fs.StringVar(&c.SkelDir, "skel-dir", env("DEVBOX_SKEL_DIR", "/etc/devbox/skel"), "home skeleton copied on first boot without overwriting")
	fs.StringVar(&c.TrustDir, "trust-dir", env("DEVBOX_TRUST_DIR", "/var/lib/devbox/trust"), "writable trust store; ca-bundle.pem is written here")
	fs.StringVar(&c.SystemCABundle, "system-ca", env("DEVBOX_SYSTEM_CA_BUNDLE", trust.DefaultSystemBundle), "system CA bundle merged into ca-bundle.pem")
	fs.StringVar(&o.egressCA, "egress-ca", env("DEVBOX_EGRESS_CA", strings.Join(trust.DefaultEgressCAGlobs, ",")), "comma-separated globs of egress interception CA PEMs")
	fs.StringVar(&c.IdentityDir, "identity-dir", env("DEVBOX_IDENTITY_DIR", "/run/plural/identity"), "federated token files and cloud SDK config")
	fs.StringVar(&c.AgentAuthDir, "agent-auth-dir", env("DEVBOX_AGENT_AUTH_DIR", "/run/plural/agent-auth"), "tmpfs for subscription credentials")
	fs.StringVar(&c.ImageInfo, "image-info", env("DEVBOX_IMAGE_INFO", "/etc/devbox/image.json"), "image description written by the image build")
	fs.StringVar(&c.RuntimeDir, "runtime-dir", env("DEVBOX_RUNTIME_DIR", ""), "runtime installed by the plural-runtime sidecar, whose agents win over the image's")
	fs.StringVar(&c.Contract, "contract", env("DEVBOX_CONTRACT", ""), "image contract version (default: image.json)")
	fs.StringVar(&c.Shell, "shell", env("DEVBOX_SHELL", env("SHELL", "/bin/bash")), "terminal login shell")
	fs.StringVar(&c.BootScript, "boot-script", env("DEVBOX_BOOT_SCRIPT", filepath.Join(home, ".config", "devbox", "boot.sh")), "user script run when an existing instance cold-boots")
	fs.DurationVar(&c.BootScriptTimeout, "boot-script-timeout", envDuration("DEVBOX_BOOT_SCRIPT_TIMEOUT", 5*time.Minute), "time limit of the boot script")
	fs.StringVar(&c.Chromium, "chromium", env("DEVBOX_CHROMIUM", "/usr/bin/chromium"), "Chromium binary")
	fs.StringVar(&c.Xvfb, "xvfb", env("DEVBOX_XVFB", "Xvfb"), "Xvfb binary")
	fs.StringVar(&c.X11VNC, "x11vnc", env("DEVBOX_X11VNC", "x11vnc"), "x11vnc binary")
	fs.StringVar(&c.Display, "display", env("DISPLAY", ":99"), "X display for the sandbox browser")
	fs.IntVar(&c.CDPPort, "cdp-port", envInt("DEVBOX_CDP_PORT", 9222), "localhost CDP port agents connect to")
	fs.IntVar(&c.VNCPort, "vnc-port", envInt("DEVBOX_VNC_PORT", 5900), "localhost x11vnc port")
	fs.DurationVar(&c.BrowserIdle, "browser-idle", envDuration("DEVBOX_BROWSER_IDLE", 15*time.Minute), "stop the browser after this long without use")
	fs.StringVar(&c.PlaywrightMCP, "playwright-mcp", env("DEVBOX_PLAYWRIGHT_MCP", ""), "Playwright MCP command (default: image.json playwrightMcp)")
	fs.IntVar(&c.MaxRunningThreads, "max-running-threads", envInt("DEVBOX_MAX_RUNNING_THREADS", agents.DefaultMaxRunningThreads), "default running-thread limit")
	fs.BoolVar(&c.InsecureNoAuth, "insecure-no-auth", envBool("DEVBOX_INSECURE_NO_AUTH"), "accept calls without a request token (local development only)")
	fs.StringVar(&o.logLevel, "log-level", env("DEVBOX_LOG_LEVEL", "info"), "debug, info, warn or error")
	fs.StringVar(&o.logFormat, "log-format", env("DEVBOX_LOG_FORMAT", "json"), "json or text")
	fs.BoolVar(&o.version, "version", false, "print the version and exit")
	return o
}

// finish applies values that aren't plain flags.
func (o *options) finish(stderr io.Writer) {
	c := &o.cfg
	c.Version = version
	for _, g := range strings.Split(o.egressCA, ",") {
		if g = strings.TrimSpace(g); g != "" {
			c.EgressCAGlobs = append(c.EgressCAGlobs, g)
		}
	}
	c.AgentOverrides = agentOverrides()
	var level slog.Level
	if err := level.UnmarshalText([]byte(o.logLevel)); err != nil {
		level = slog.LevelInfo
	}
	hopts := &slog.HandlerOptions{Level: level}
	var h slog.Handler = slog.NewJSONHandler(stderr, hopts)
	if o.logFormat == "text" {
		h = slog.NewTextHandler(stderr, hopts)
	}
	c.Log = slog.New(h).With("service", "devbox-daemon")
	slog.SetDefault(c.Log)
}

// agentOverrides reads DEVBOX_AGENT_<NAME>_COMMAND (whitespace-separated command and arguments).
func agentOverrides() map[devboxv1.AgentType]harness.Command {
	out := map[devboxv1.AgentType]harness.Command{}
	for _, t := range harness.AllAgents {
		v := os.Getenv("DEVBOX_AGENT_" + strings.ToUpper(harness.AgentName(t)) + "_COMMAND")
		if f := strings.Fields(v); len(f) > 0 {
			out[t] = harness.Command{Path: f[0], Args: f[1:]}
		}
	}
	return out
}

func run(args []string) int {
	fs := flag.NewFlagSet("devbox-daemon", flag.ContinueOnError)
	o := register(fs)
	if err := fs.Parse(args); err != nil {
		return 2
	}
	if o.version {
		fmt.Println(version)
		return 0
	}
	o.finish(os.Stderr)
	log := o.cfg.Log

	guestCfg, err := guest.FromEnv()
	if err != nil {
		log.Error("startup failed", "err", err)
		return 1
	}
	o.cfg.Guest = guestCfg
	d, err := daemon.New(o.cfg)
	if err != nil {
		log.Error("startup failed", "err", err)
		return 1
	}
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// PID 1 gets no default signal dispositions: handle termination, forward the rest to supervised children.
	sigs := make(chan os.Signal, 8)
	signal.Notify(sigs, syscall.SIGTERM, syscall.SIGINT, syscall.SIGHUP, syscall.SIGUSR1, syscall.SIGUSR2)
	go func() {
		for sig := range sigs {
			switch sig {
			case syscall.SIGTERM, syscall.SIGINT:
				log.Info("terminating", "signal", sig.String())
				cancel()
			default:
				d.Forward(sig.(syscall.Signal))
			}
		}
	}()
	if err := d.Run(ctx); err != nil {
		log.Error("daemon exited", "err", err)
		return 1
	}
	return 0
}

func runProbe(args []string, stdout, stderr io.Writer) int {
	fs := flag.NewFlagSet("devbox-daemon probe", flag.ContinueOnError)
	fs.SetOutput(stderr)
	o := register(fs)
	asJSON := fs.Bool("json", false, "print the catalog as JSON (AgentCatalogEntry list)")
	only := fs.String("agents", "", "comma-separated agents to probe (default: every agent in image.json)")
	def := fs.String("default-agent", "", "agent marked is_default")
	aiProxy := fs.String("ai-proxy-url", env("DEVBOX_AI_PROXY_URL", ""), "AI proxy URL, for adapters that list models only when authenticated")
	timeout := fs.Duration("timeout", 5*time.Minute, "overall probe timeout")
	if err := fs.Parse(args); err != nil {
		return 2
	}
	o.logFormat = "text"
	o.finish(stderr)

	img, err := daemon.LoadImage(o.cfg)
	if err != nil {
		fmt.Fprintln(stderr, err)
		return 1
	}
	specs := daemon.ImageProbeSpecs(img, *def)
	if *only != "" {
		want := map[devboxv1.AgentType]bool{}
		for _, name := range strings.Split(*only, ",") {
			t, ok := harness.ParseAgent(name)
			if !ok {
				fmt.Fprintf(stderr, "unknown agent %q\n", name)
				return 2
			}
			want[t] = true
		}
		var filtered []*devboxv1.AgentProbeSpec
		for _, s := range specs {
			if want[s.GetType()] {
				filtered = append(filtered, s)
				delete(want, s.GetType())
			}
		}
		for t := range want {
			filtered = append(filtered, &devboxv1.AgentProbeSpec{Type: t, IsDefault: harness.AgentName(t) == *def})
		}
		specs = filtered
	}
	var ep *devboxv1.HarnessEndpoints
	if *aiProxy != "" {
		ep = &devboxv1.HarnessEndpoints{AiProxyUrl: *aiProxy}
	}
	ctx, cancel := context.WithTimeout(context.Background(), *timeout)
	defer cancel()
	entries, err := daemon.Probe(ctx, o.cfg, specs, ep)
	if err != nil {
		fmt.Fprintln(stderr, err)
		return 1
	}
	resp := &devboxv1.ProbeAgentsResponse{Agents: entries}
	if *asJSON {
		data, err := protojson.MarshalOptions{Multiline: true, Indent: "  "}.Marshal(resp)
		if err != nil {
			fmt.Fprintln(stderr, err)
			return 1
		}
		fmt.Fprintln(stdout, string(data))
	} else {
		for _, e := range entries {
			fmt.Fprintf(stdout, "%-10s %-22s models=%d %s\n", harness.AgentName(e.GetType()), e.GetProbeStatus(),
				len(e.GetModels()), e.GetProbeError())
		}
	}
	failed := 0
	for _, e := range entries {
		if e.GetProbeStatus() != devboxv1.ProbeStatus_PROBE_STATUS_OK {
			failed++
		}
	}
	if failed == len(entries) {
		return 1
	}
	return 0
}
