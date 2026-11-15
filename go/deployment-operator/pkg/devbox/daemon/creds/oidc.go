// Package creds manages the credentials that must live in the sandbox (sections 4.9 and 4.11): cloud OIDC token
// files with SDK configuration, and the Codex subscription bundle on tmpfs with compare-and-swap write-back.
// Everything else (SCM, AI proxy, console, Claude OAuth) is injected at egress and never enters the box.
package creds

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"errors"
	"fmt"
	"log/slog"
	"net/url"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials"
	"google.golang.org/grpc/credentials/insecure"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/internal/clock"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/internal/fsutil"
)

// Defaults for token refresh.
const (
	defaultRefresh  = 5 * time.Minute
	minRefresh      = 15 * time.Second
	retryAfterError = 30 * time.Second
	envFileName     = "env"
)

// Dial connects to the gateway's SandboxCredentials service through egress. https URLs use TLS with the
// sandbox's trust bundle (egress intercepts and re-signs); http URLs are plaintext.
func Dial(rawURL, caBundle string) (devboxv1.SandboxCredentialsClient, *grpc.ClientConn, error) {
	u, err := url.Parse(rawURL)
	if err != nil || u.Host == "" {
		return nil, nil, fmt.Errorf("invalid sandbox credentials url %q", rawURL)
	}
	host := u.Host
	var tc credentials.TransportCredentials
	switch u.Scheme {
	case "https", "grpcs":
		if u.Port() == "" {
			host += ":443"
		}
		cfg := &tls.Config{MinVersion: tls.VersionTLS12, ServerName: u.Hostname()}
		if caBundle != "" {
			if pem, err := os.ReadFile(caBundle); err == nil {
				pool, _ := x509.SystemCertPool()
				if pool == nil {
					pool = x509.NewCertPool()
				}
				pool.AppendCertsFromPEM(pem)
				cfg.RootCAs = pool
			}
		}
		tc = credentials.NewTLS(cfg)
	default:
		if u.Port() == "" {
			host += ":80"
		}
		tc = insecure.NewCredentials()
	}
	conn, err := grpc.NewClient(host, grpc.WithTransportCredentials(tc))
	if err != nil {
		return nil, nil, err
	}
	return devboxv1.NewSandboxCredentialsClient(conn), conn, nil
}

// Options configure a Manager.
type Options struct {
	Home string
	// IdentityDir holds OIDC token files and SDK config (/run/plural/identity).
	IdentityDir string
	// AgentAuthDir is the subscription-credential tmpfs (/run/plural/agent-auth).
	AgentAuthDir string
	// Client returns the SandboxCredentials client (nil while Initialize hasn't provided endpoints).
	Client     func() devboxv1.SandboxCredentialsClient
	InstanceID func() string
	Clock      clock.Clock
	Log        *slog.Logger
	// Condition reports a daemon condition.
	Condition func(typ, severity, msg string, active bool)
	// CodexLogin runs `codex login --with-access-token` (overridable in tests).
	CodexLogin func(ctx context.Context, codexHome, token string) error
}

// Manager owns sandbox credentials.
type Manager struct {
	opts Options
	log  *slog.Logger

	mu         sync.Mutex
	identities []*devboxv1.CloudIdentity
	tokens     map[string]time.Time
	codex      *codexState
	wake       chan struct{}
}

// New returns a Manager.
func New(opts Options) *Manager {
	if opts.Clock == nil {
		opts.Clock = clock.Real{}
	}
	if opts.Log == nil {
		opts.Log = slog.Default()
	}
	if opts.CodexLogin == nil {
		opts.CodexLogin = codexAccessTokenLogin
	}
	return &Manager{opts: opts, log: opts.Log.With("component", "creds"), tokens: map[string]time.Time{}, wake: make(chan struct{}, 1)}
}

func (m *Manager) client() devboxv1.SandboxCredentialsClient {
	if m.opts.Client == nil {
		return nil
	}
	return m.opts.Client()
}

func (m *Manager) condition(typ, severity, msg string, active bool) {
	if m.opts.Condition != nil {
		m.opts.Condition(typ, severity, msg, active)
	}
}

// SetIdentities records the box's cloud identities and writes their SDK configuration.
func (m *Manager) SetIdentities(ids []*devboxv1.CloudIdentity) error {
	m.mu.Lock()
	m.identities = ids
	m.mu.Unlock()
	m.kick()
	return m.WriteSDKConfig()
}

func (m *Manager) kick() {
	select {
	case m.wake <- struct{}{}:
	default:
	}
}

// TokenPath is an identity's token file.
func (m *Manager) TokenPath(name string) string {
	return filepath.Join(m.opts.IdentityDir, name, "token")
}

func validName(n string) bool {
	return n != "" && !strings.ContainsAny(n, "/\\") && !strings.HasPrefix(n, ".")
}

// defaults returns the default identity per cloud: the one marked is_default, else the first.
func defaults(ids []*devboxv1.CloudIdentity) map[string]*devboxv1.CloudIdentity {
	out := map[string]*devboxv1.CloudIdentity{}
	cloud := func(id *devboxv1.CloudIdentity) string {
		switch {
		case id.GetAws() != nil:
			return "aws"
		case id.GetGcp() != nil:
			return "gcp"
		case id.GetAzure() != nil:
			return "azure"
		}
		return ""
	}
	for _, id := range ids {
		if c := cloud(id); c != "" && id.GetIsDefault() {
			if _, ok := out[c]; !ok {
				out[c] = id
			}
		}
	}
	for _, id := range ids {
		if c := cloud(id); c != "" {
			if _, ok := out[c]; !ok {
				out[c] = id
			}
		}
	}
	return out
}

// gcpAudience turns a WIF provider resource name into the STS audience.
func gcpAudience(provider string) string {
	if strings.HasPrefix(provider, "//") {
		return provider
	}
	return "//iam.googleapis.com/" + strings.TrimPrefix(provider, "/")
}

// WriteSDKConfig writes per-identity SDK config and the env file shells and harnesses source:
//   - AWS: ~/.aws/config profiles (web_identity_token_file), plus AWS_* env for the default;
//   - GCP: <identity>/gcp-credentials.json external_account configs, GOOGLE_APPLICATION_CREDENTIALS for the default;
//   - Azure: <identity>/azure.env, plus AZURE_* env for the default.
func (m *Manager) WriteSDKConfig() error {
	m.mu.Lock()
	ids := append([]*devboxv1.CloudIdentity(nil), m.identities...)
	m.mu.Unlock()
	if m.opts.IdentityDir == "" {
		return nil
	}
	if err := os.MkdirAll(m.opts.IdentityDir, 0o700); err != nil {
		return err
	}
	inst := ""
	if m.opts.InstanceID != nil {
		inst = m.opts.InstanceID()
	}
	if inst == "" {
		inst = "devbox"
	}
	def := defaults(ids)
	env := map[string]string{}
	var aws strings.Builder
	for _, id := range ids {
		if !validName(id.GetName()) {
			continue
		}
		dir := filepath.Join(m.opts.IdentityDir, id.GetName())
		if err := os.MkdirAll(dir, 0o700); err != nil {
			return err
		}
		token := m.TokenPath(id.GetName())
		switch {
		case id.GetAws() != nil:
			a := id.GetAws()
			section := "profile " + id.GetName()
			if def["aws"] == id {
				fmt.Fprintf(&aws, "[default]\nrole_arn = %s\nweb_identity_token_file = %s\nrole_session_name = %s\n", a.GetRoleArn(), token, inst)
				if a.GetDurationSeconds() > 0 {
					fmt.Fprintf(&aws, "duration_seconds = %d\n", a.GetDurationSeconds())
				}
				aws.WriteString("\n")
				env["AWS_ROLE_ARN"] = a.GetRoleArn()
				env["AWS_WEB_IDENTITY_TOKEN_FILE"] = token
				env["AWS_ROLE_SESSION_NAME"] = inst
			}
			fmt.Fprintf(&aws, "[%s]\nrole_arn = %s\nweb_identity_token_file = %s\nrole_session_name = %s\n", section, a.GetRoleArn(), token, inst)
			if a.GetDurationSeconds() > 0 {
				fmt.Fprintf(&aws, "duration_seconds = %d\n", a.GetDurationSeconds())
			}
			aws.WriteString("\n")
		case id.GetGcp() != nil:
			g := id.GetGcp()
			cfg := map[string]any{
				"type":               "external_account",
				"audience":           gcpAudience(g.GetWorkloadIdentityProvider()),
				"subject_token_type": "urn:ietf:params:oauth:token-type:jwt",
				"token_url":          "https://sts.googleapis.com/v1/token",
				"credential_source":  map[string]any{"file": token},
			}
			if sa := g.GetServiceAccount(); sa != "" {
				cfg["service_account_impersonation_url"] = "https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/" + sa + ":generateAccessToken"
			}
			path := filepath.Join(dir, "gcp-credentials.json")
			if err := fsutil.WriteJSON(path, cfg, 0o600); err != nil {
				return err
			}
			if def["gcp"] == id {
				env["GOOGLE_APPLICATION_CREDENTIALS"] = path
				env["CLOUDSDK_AUTH_CREDENTIAL_FILE_OVERRIDE"] = path
			}
		case id.GetAzure() != nil:
			z := id.GetAzure()
			authority := z.GetAuthorityHost()
			if authority == "" {
				authority = "https://login.microsoftonline.com/"
			}
			vars := map[string]string{
				"AZURE_CLIENT_ID": z.GetClientId(), "AZURE_TENANT_ID": z.GetTenantId(),
				"AZURE_FEDERATED_TOKEN_FILE": token, "AZURE_AUTHORITY_HOST": authority,
			}
			if err := fsutil.WriteFileAtomic(filepath.Join(dir, "azure.env"), []byte(renderEnv(vars)), 0o600); err != nil {
				return err
			}
			if def["azure"] == id {
				for k, v := range vars {
					env[k] = v
				}
			}
		}
	}
	if aws.Len() > 0 && m.opts.Home != "" {
		if err := fsutil.WriteFileAtomic(filepath.Join(m.opts.Home, ".aws", "config"), []byte(aws.String()), 0o600); err != nil {
			return err
		}
	}
	return fsutil.WriteFileAtomic(filepath.Join(m.opts.IdentityDir, envFileName), []byte(renderEnv(env)), 0o644)
}

func renderEnv(vars map[string]string) string {
	keys := make([]string, 0, len(vars))
	for k := range vars {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	var b strings.Builder
	for _, k := range keys {
		fmt.Fprintf(&b, "%s=%s\n", k, vars[k])
	}
	return b.String()
}

// Env returns the default identities' environment (for harness and terminal processes).
func (m *Manager) Env() []string {
	raw, err := os.ReadFile(filepath.Join(m.opts.IdentityDir, envFileName))
	if err != nil {
		return nil
	}
	var out []string
	for _, line := range strings.Split(string(raw), "\n") {
		if strings.Contains(line, "=") {
			out = append(out, line)
		}
	}
	return out
}

// RefreshOIDC fetches current tokens for every identity and rewrites their files. It returns when the next
// refresh is due.
func (m *Manager) RefreshOIDC(ctx context.Context) (time.Time, error) {
	m.mu.Lock()
	n := len(m.identities)
	m.mu.Unlock()
	now := m.opts.Clock.Now()
	if n == 0 {
		return now.Add(defaultRefresh), nil
	}
	c := m.client()
	if c == nil {
		return now.Add(retryAfterError), errors.New("sandbox credentials endpoint not configured")
	}
	resp, err := c.GetSandboxCredential(ctx, &devboxv1.GetSandboxCredentialRequest{Selector: &devboxv1.CredentialSelector{Kind: devboxv1.CredentialKind_CREDENTIAL_KIND_OIDC}})
	if err != nil {
		m.condition("oidc_refresh_failed", "warning", "cloud identity tokens couldn't be refreshed: "+err.Error(), true)
		return now.Add(retryAfterError), err
	}
	next := now.Add(defaultRefresh)
	for _, cred := range resp.GetCredentials() {
		if err := m.applyOIDC(cred); err != nil {
			return now.Add(retryAfterError), err
		}
		if ra := cred.GetRefreshAfter(); ra != nil && ra.AsTime().Before(next) {
			next = ra.AsTime()
		} else if ex := cred.GetExpiresAt(); ex != nil && ex.AsTime().Add(-2*time.Minute).Before(next) {
			next = ex.AsTime().Add(-2 * time.Minute)
		}
	}
	m.condition("oidc_refresh_failed", "warning", "", false)
	if next.Sub(now) < minRefresh {
		next = now.Add(minRefresh)
	}
	return next, nil
}

func (m *Manager) applyOIDC(cred *devboxv1.InstanceCredential) error {
	name := cred.GetIdentity()
	if !validName(name) {
		return fmt.Errorf("invalid identity name %q", name)
	}
	if err := fsutil.WriteFileAtomic(m.TokenPath(name), []byte(cred.GetToken()), 0o600); err != nil {
		return err
	}
	m.mu.Lock()
	if cred.GetExpiresAt() != nil {
		m.tokens[name] = cred.GetExpiresAt().AsTime()
	}
	m.mu.Unlock()
	return nil
}

// RunOIDC keeps token files fresh until ctx ends.
func (m *Manager) RunOIDC(ctx context.Context) {
	for {
		next, err := m.RefreshOIDC(ctx)
		if err != nil {
			m.log.Warn("oidc refresh", "err", err)
		}
		select {
		case <-ctx.Done():
			return
		case <-m.wake:
		case <-m.opts.Clock.After(next.Sub(m.opts.Clock.Now())):
		}
	}
}
