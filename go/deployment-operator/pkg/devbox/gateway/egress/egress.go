// Package egress is the egress, credentials and MCP half of devbox-gateway (sections 4.4, 4.5, 4.7, 4.8, 4.9,
// 4.10 and 4.11 of the DevBoxes plan). It serves:
//
//   - the Plural credential provider (substrate.credprovider.v1.CredentialProvider) that atenet-egress calls to
//     resolve ate-secret://plural.sh/instances/<id>/<kind> URIs, over mTLS pinned to the egress gateway's SAN;
//   - devbox-egress-authz, the Envoy ext_proc that atenet-egress runs as its additional egress processor, which
//     enforces the repository allowlist on SCM hosts and observes PR creations made outside the MCP;
//   - the devbox MCP, which serves PR tools multi-tenant to sandboxes, authenticated by the actor JWT egress injects.
//     It's an http.Handler (Service.MCPHandler) the gateway mounts on its DefaultMCPPort server.
//
// BuildPolicy turns an instance into the egress rules the gateway core applies with Substrate's EgressPolicy API.
package egress

import (
	"context"
	"errors"
	"sync"

	"github.com/go-logr/logr"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/gateway/egress/rules"
)

// InstanceInfo is everything the egress components need to know about one running devbox instance. The gateway
// core builds it from the box (DevboxRunner), the instance and its workbench.
type InstanceInfo struct {
	InstanceID string
	// Golden marks the golden boot of one of the box's templates, which clones the runner's repositories before
	// any instance exists: InstanceID is the runner's GoldenInstanceID, and its only credentials are the box's
	// (BoxID) SCM ones.
	Golden      bool
	BoxID       string
	WorkbenchID string
	UserID      string
	ClusterID   string
	// AllowedRepositories is the effective allowlist: the runner's allowedRepositories, optionally narrowed by the
	// workbench's coding repositories. Entries are repository URLs in any form Git.normalize_url accepts
	// (https://github.com/o/r.git, git@github.com:o/r, github.com/o/r). Empty allows every repository on the SCM
	// hosts, matching AgentRuntime.allowed_repository?.
	AllowedRepositories []string
	// HTTPAllowlist is the runner's HTTP allowlist.
	HTTPAllowlist []AllowEntry
	// SCMHosts are the hosts of the box's SCM connections, e.g. github.com or gitlab.example.com. Well-known
	// companion hosts (api.github.com, codeload.github.com, ...) are added by BuildPolicy.
	SCMHosts []string
	// ConsoleHost is the console host serving the AI proxy and workbench MCP, e.g. console.example.com.
	ConsoleHost string
	// AgentBilling maps an agent ("claude", "codex", or the AGENT_TYPE_* enum name) to "proxy" or "subscription".
	AgentBilling map[string]string
	// CloudIdentityHosts are the token-exchange and API hosts of the box's cloud identities (section 4.9).
	CloudIdentityHosts []string

	// SCMProviders optionally maps an SCM host to its provider: github, gitlab, bitbucket, bitbucket_datacenter or
	// azure_devops. Well-known public hosts are inferred; set it for self-hosted SCMs.
	SCMProviders map[string]string
	// AIProxyHost optionally serves the AI proxy from a host other than ConsoleHost. When empty or equal to
	// ConsoleHost, one console-host rule injects the instance's console credential (see BuildPolicy).
	AIProxyHost string
	// Checkouts maps workspace paths and directory names to remotes, so devbox MCP tools accept a repository
	// path as well as a remote URL. The core fills it from the daemon's InstanceAggregate.checkouts.
	Checkouts []*devboxv1.Checkout
	// Gateway overrides the devbox MCP endpoint BuildPolicy targets. When zero, BuildPolicy uses the endpoint
	// configured by the most recent New or SetGatewayEndpoint.
	Gateway GatewayEndpoint
}

// AllowEntry is one runner HTTP allowlist entry.
type AllowEntry struct {
	Host string
	// Port defaults to 443.
	Port int32
	// Passthrough forwards TLS undecrypted (tls_passthrough). Such hosts get no credential injection.
	Passthrough bool
	// Cleartext allows plain HTTP instead (Port then defaults to 80).
	Cleartext bool
}

// ActorResolver maps a Substrate actor to the devbox instance it runs. Implemented by the gateway core.
//
// actorID is "<atespace>/<actor-name>" (see ActorIDFromSPIFFEID and ActorIDFromJWTSubject). It returns
// ErrUnknownActor (or a nil InstanceInfo) for actors that aren't devbox instances.
type ActorResolver interface {
	ResolveActor(ctx context.Context, actorID string) (*InstanceInfo, error)
}

// ErrUnknownActor reports that an actor isn't a devbox instance this gateway manages.
var ErrUnknownActor = errors.New("actor is not a devbox instance")

// BranchDiffs sizes a pull request's branch in the instance's checkout (the core, through the daemon).
type BranchDiffs interface {
	GetBranchDiffStat(ctx context.Context, req *devboxv1.BranchDiffStatRequest) (*devboxv1.BranchDiffStatResponse, error)
}

// Deps are the collaborators the gateway core provides.
type Deps struct {
	Ingest devboxv1.IngestClient
	Actors ActorResolver
	Logger logr.Logger

	// Diffs is optional; without it devbox PRs carry no line counts or commit SHAs.
	Diffs BranchDiffs
}

// Config configures the three listeners. An empty address disables that listener.
type Config struct {
	// CredentialProviderAddr is the credential provider's gRPC listen address, normally DefaultCredentialProviderAddr.
	// Registered with Substrate as {"name":"plural.sh","address":"devbox-gateway.<ns>.svc:50052"}.
	CredentialProviderAddr string
	// AuthzAddr is the ext_proc gRPC listen address, normally DefaultAuthzAddr. Registered with Substrate as
	// atenet.egress.additionalExtprocService=<ns>/devbox-egress-authz:50053.
	AuthzAddr string
	// MCPAddr optionally serves the devbox MCP on its own HTTP listener. devbox-gateway leaves it empty and mounts
	// Service.MCPHandler on its DefaultMCPPort server instead; the MCP itself is built whenever ActorJWTIssuer is set.
	MCPAddr string

	// TLS shared by the credential provider and the ext_proc, both called only by atenet-egress.
	// ServerCertFile and ServerKeyFile hold the serving certificate; ServerBundleFile may hold both (PEM key and
	// chain, like Substrate's credential bundles) instead. The certificate must carry the DNS SAN atenet-egress
	// verifies (devbox-gateway.<ns>.svc for the ext_proc). Files are re-read on each handshake, so rotation needs
	// no restart.
	ServerCertFile   string
	ServerKeyFile    string
	ServerBundleFile string
	// ClientCAFile is the pod-identity trust bundle caller certificates must chain to.
	ClientCAFile string
	// AllowedClientSANs are the URI SANs accepted from callers. Defaults to DefaultEgressSPIFFEID.
	AllowedClientSANs []string
	// InsecureSkipClientAuth serves the credential provider and ext_proc without TLS. Tests and local
	// development only; the credential provider must never run like this in a cluster.
	InsecureSkipClientAuth bool

	// MCP TLS. When MCPCertFile and MCPKeyFile are set the MCP serves HTTPS, otherwise cleartext HTTP (the egress
	// rule is then "http", and the actor JWT crosses the cluster network unencrypted).
	MCPCertFile string
	MCPKeyFile  string

	// Gateway is the in-cluster endpoint sandboxes reach the devbox MCP at through egress. BuildPolicy emits an
	// actor-JWT rule for it.
	Gateway GatewayEndpoint

	// ActorJWTIssuer is the Substrate actor JWT issuer (ate-idp-server), e.g.
	// https://idp.ate-system.svc. Its /.well-known/openid-configuration names the JWKS.
	ActorJWTIssuer string
	// ActorJWTIssuerCAFile optionally verifies the issuer's TLS certificate.
	ActorJWTIssuerCAFile string

	// SCMHTTPProxy optionally routes the MCP's SCM API calls (PR state, CI logs) through a proxy.
	SCMHTTPProxy string
}

// GatewayEndpoint is where sandboxes reach the gateway's actor-JWT-authenticated services through egress.
type GatewayEndpoint struct {
	// Host is the gateway Service DNS name, e.g. devbox-gateway.plrl-deploy-operator.svc.
	Host string
	// Port is the Service port of the MCP listener.
	Port int32
	// TLS selects an https rule; otherwise http.
	TLS bool
	// Audience is the actor JWT audience egress mints and the MCP verifies. Defaults to the endpoint URL.
	Audience string
	// ExpirationSeconds is the actor JWT lifetime (300-3600). Defaults to 900.
	ExpirationSeconds int64
}

const (
	// DefaultEgressSPIFFEID is atenet-egress's pod identity in a default Substrate install.
	DefaultEgressSPIFFEID = "spiffe://cluster.local/ns/ate-system/sa/atenet-egress"
	// CredentialProviderName is the provider class registered with Substrate.
	CredentialProviderName = rules.CredentialProviderName
)

// Ports of the devbox-gateway Services the operator creates (internal/controller/devboxrunner_gateway.go): the
// credential provider and the devbox MCP (with SandboxCredentials) on devbox-gateway, the ext_proc on
// devbox-egress-authz.
const (
	DefaultCredentialProviderPort = 50052
	DefaultAuthzPort              = 50053
	DefaultMCPPort                = 8080

	DefaultCredentialProviderAddr = ":50052"
	DefaultAuthzAddr              = ":50053"
	DefaultMCPAddr                = ":8080"
)

// Credential kinds as they appear in ate-secret://plural.sh/instances/<id>/<kind> URIs.
const (
	KindSCM         = rules.KindSCM
	KindSCMToken    = rules.KindSCMToken
	KindAIProxy     = rules.KindAIProxy
	KindConsole     = rules.KindConsole
	KindClaudeOAuth = rules.KindClaudeOAuth
	KindOIDC        = rules.KindOIDC
)

// GoldenInstanceID is the egress pseudo-instance of a runner's golden boots.
func GoldenInstanceID(runner string) string { return rules.GoldenInstanceID(runner) }

// RepositoryAllowed reports whether repo is on allowed with the matching the ext_proc enforces; an empty allowlist
// allows every repository.
func RepositoryAllowed(allowed []string, repo string) bool {
	return rules.RepositoryAllowed(allowed, repo)
}

type (
	Policy       = rules.Policy
	Rule         = rules.Rule
	HeaderSecret = rules.HeaderSecret
)

const (
	SchemeHTTPS          = rules.SchemeHTTPS
	SchemeHTTP           = rules.SchemeHTTP
	SchemeTLSPassthrough = rules.SchemeTLSPassthrough
)

// Run starts the credential provider, the ext_proc authz server and the devbox MCP, and blocks until ctx is done
// or a listener fails.
func Run(ctx context.Context, cfg Config, deps Deps) error {
	svc, err := New(cfg, deps)
	if err != nil {
		return err
	}
	return svc.Run(ctx)
}

var (
	servicesMu sync.Mutex
	services   = map[*Service]struct{}{}
)

// Invalidate drops everything cached for an instance in every running Service: credentials, the actor mapping and
// the allowlist. Call it when an instance ends or its box's allowlist, SCM associations or billing change.
func Invalidate(instanceID string) {
	servicesMu.Lock()
	defer servicesMu.Unlock()
	for s := range services {
		s.Invalidate(instanceID)
	}
}

func register(s *Service) {
	servicesMu.Lock()
	defer servicesMu.Unlock()
	services[s] = struct{}{}
}

func unregister(s *Service) {
	servicesMu.Lock()
	defer servicesMu.Unlock()
	delete(services, s)
}
