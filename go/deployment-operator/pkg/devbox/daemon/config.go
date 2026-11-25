package daemon

import (
	"log/slog"
	"path/filepath"
	"time"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/harness"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/internal/clock"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/guest"
)

// Config holds every path and port the daemon uses. cmd/devbox-daemon fills it from flags and DEVBOX_* env.
type Config struct {
	// ListenAddr serves gRPC (h2c) and HTTP on one port (":80").
	ListenAddr string
	// Home is the dev user's home on the workspace volume (/home/dev).
	Home string
	// StateDir holds the daemon's durable state, event log included (~/.plural).
	StateDir string
	// SkelDir is copied into Home on first boot without overwriting (/etc/devbox/skel).
	SkelDir string
	// TrustDir is the writable trust store; TrustBundle() is what the CA env vars point at.
	TrustDir string
	// SystemCABundle is merged with the egress interception CA(s) matched by EgressCAGlobs.
	SystemCABundle string
	EgressCAGlobs  []string
	// IdentityDir holds federated token files and SDK config (/run/plural/identity).
	IdentityDir string
	// AgentAuthDir is the subscription-credential tmpfs (/run/plural/agent-auth).
	AgentAuthDir string
	// ImageInfo is /etc/devbox/image.json.
	ImageInfo string
	// RuntimeDir is the runtime the plural-runtime sidecar installed into the home volume, whose agents win over
	// the image's (DEVBOX_RUNTIME_DIR, set by the devbox container's command). Empty: only the image's.
	RuntimeDir string
	// LoaderRoot prefixes the glibc loader path checked before using the runtime's agents (tests).
	LoaderRoot string
	// Contract overrides the image contract version (DEVBOX_CONTRACT).
	Contract string
	// Shell is the terminals' login shell.
	Shell string
	// BootScript is the user's script run when an existing instance cold-boots (~/.config/devbox/boot.sh).
	BootScript string
	// BootScriptTimeout bounds BootScript.
	BootScriptTimeout time.Duration

	Chromium    string
	Xvfb        string
	X11VNC      string
	Display     string
	CDPPort     int
	VNCPort     int
	BrowserIdle time.Duration
	// PlaywrightMCP is the Playwright MCP command added to every session (empty: image.json's playwrightMcp).
	PlaywrightMCP string

	// MaxRunningThreads is the default concurrency limit before Initialize sets one.
	MaxRunningThreads int
	// AgentOverrides replace an agent's ACP command (DEVBOX_AGENT_<NAME>_COMMAND; local development and tests).
	AgentOverrides map[devboxv1.AgentType]harness.Command
	// InsecureNoAuth accepts calls without a request token even after Initialize delivered keys (local only).
	InsecureNoAuth bool
	// Guest is the runner's DEVBOX_RUNNER_CONFIG, whose repositories, mise config and bootstrap script the
	// golden boot applies.
	Guest *guest.Config

	Version string
	Clock   clock.Clock
	Log     *slog.Logger
}

// TrustBundle is the CA bundle path every child process is pointed at.
func (c *Config) TrustBundle() string { return filepath.Join(c.TrustDir, "ca-bundle.pem") }

// JavaTrustStore is the image's writable JDK truststore; the JDK's cacerts is a symlink to it.
func (c *Config) JavaTrustStore() string { return filepath.Join(c.TrustDir, "java-cacerts") }

func (c *Config) defaults() {
	if c.ListenAddr == "" {
		c.ListenAddr = ":80"
	}
	if c.Home == "" {
		c.Home = "/home/dev"
	}
	if c.StateDir == "" {
		c.StateDir = filepath.Join(c.Home, ".plural")
	}
	if c.TrustDir == "" {
		c.TrustDir = filepath.Join(c.StateDir, "trust")
	}
	if c.BootScript == "" {
		c.BootScript = filepath.Join(c.Home, ".config", "devbox", "boot.sh")
	}
	if c.BootScriptTimeout <= 0 {
		c.BootScriptTimeout = 5 * time.Minute
	}
	if c.IdentityDir == "" {
		c.IdentityDir = "/run/plural/identity"
	}
	if c.AgentAuthDir == "" {
		c.AgentAuthDir = "/run/plural/agent-auth"
	}
	if c.Display == "" {
		c.Display = ":99"
	}
	if c.CDPPort == 0 {
		c.CDPPort = 9222
	}
	if c.VNCPort == 0 {
		c.VNCPort = 5900
	}
	if c.Version == "" {
		c.Version = "dev"
	}
	if c.Clock == nil {
		c.Clock = clock.Real{}
	}
	if c.Log == nil {
		c.Log = slog.Default()
	}
}
