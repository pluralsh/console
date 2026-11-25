// Package rules is the pure half of devbox egress: rule types, credential URIs, SCM host and repository matching,
// and the conversion to Substrate egress rules. It imports nothing from the gateway, so the operator can render
// golden egress policies with the same rules the gateway applies to instances.
package rules

import (
	"fmt"
	"net"
	"slices"
	"strings"

	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/gateway/egress/scmpath"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/substrate/ateapi"
)

// CredentialProviderName is the provider class registered with Substrate.
const CredentialProviderName = "plural.sh"

// Credential kinds as they appear in ate-secret://plural.sh/instances/<id>/<kind> URIs.
const (
	KindSCM = "scm"
	// KindSCMToken resolves the same SCM credential as KindSCM, but as the bare token rather than an Authorization
	// value, for APIs that take it in their own header (GitLab's PRIVATE-TOKEN).
	KindSCMToken    = "scm-token"
	KindAIProxy     = "ai-proxy"
	KindConsole     = "console"
	KindClaudeOAuth = "claude-oauth"
	KindOIDC        = "oidc"
)

const (
	SchemeHTTPS          = "https"
	SchemeHTTP           = "http"
	SchemeTLSPassthrough = "tls_passthrough"
)

const (
	AuthorizationHeader = "Authorization"
	// PrivateTokenHeader is how GitLab API clients (glab, go-gitlab) send a token. GitLab's REST API rejects the
	// Basic Authorization git needs, so SCM rules also replace this header, with the bare token.
	PrivateTokenHeader = "PRIVATE-TOKEN"
)

// scmCompanions are hosts that serve a public SCM alongside its main host and accept the same token.
var scmCompanions = map[string][]string{
	"github.com":    {"api.github.com", "codeload.github.com", "raw.githubusercontent.com", "uploads.github.com"},
	"bitbucket.org": {"api.bitbucket.org"},
}

// signedStorageHosts are the object-storage hosts LFS objects, release assets and Actions logs redirect to. Their URLs
// are signed and minted only after an allowed request, so they get no injection and the ext_proc lets them through.
// Actions logs live on productionresultssa<N>.blob.core.windows.net, but only *.suffix wildcards exist, so the whole
// Azure blob suffix is allowed.
var signedStorageHosts = map[string][]string{
	"github.com": {
		"objects.githubusercontent.com",
		"github-releases.githubusercontent.com",
		"release-assets.githubusercontent.com",
		"github-cloud.githubusercontent.com",
		"github-cloud.s3.amazonaws.com",
		"*.blob.core.windows.net",
	},
	"bitbucket.org": {"bbuseruploads.s3.amazonaws.com"},
}

// SignedStorageHosts are the signed object-storage hosts an SCM host redirects to.
func SignedStorageHosts(host string) []string { return signedStorageHosts[host] }

// CanonicalSCMHost maps a companion host to the connection host its token belongs to.
func CanonicalSCMHost(host string) string {
	host = NormalizeHost(host)
	for primary, companions := range scmCompanions {
		if slices.Contains(companions, host) {
			return primary
		}
	}
	return host
}

// NormalizeHost lowercases a host and strips any scheme, path, port and trailing dot.
func NormalizeHost(h string) string {
	h = strings.ToLower(strings.TrimSpace(h))
	if i := strings.Index(h, "://"); i >= 0 {
		h = h[i+3:]
	}
	if i := strings.IndexAny(h, "/?#"); i >= 0 {
		h = h[:i]
	}
	if i := strings.LastIndex(h, "@"); i >= 0 {
		h = h[i+1:]
	}
	if host, _, err := net.SplitHostPort(h); err == nil {
		h = host
	}
	return strings.TrimSuffix(h, ".")
}

// SecretURI is the credential URI for one of an instance's credentials. SCM URIs name the connection host.
func SecretURI(instanceID, kind, host string) string {
	uri := "ate-secret://" + CredentialProviderName + "/instances/" + instanceID + "/" + kind
	if host != "" {
		uri += "/" + host
	}
	return uri
}

// GoldenInstanceID is the egress pseudo-instance of a runner's golden boots. Instance IDs are UUIDs and probes
// are probe-<name>, so the dot keeps it apart from both.
func GoldenInstanceID(runner string) string { return "golden." + runner }

// Policy is an instance's egress policy, in a shape close to Substrate's EgressPolicy.
type Policy struct {
	Rules []Rule
}

// Rule is one egress rule. Rules are unique by (Host, Port).
type Rule struct {
	Host string
	// Port is 443 for https and tls_passthrough, 80 for http, unless set.
	Port int32
	// Scheme is "https", "http" or "tls_passthrough".
	Scheme string
	// InjectHeader, when set, is replaced with Prefix plus a credential: SecretURI's, or the actor JWT.
	InjectHeader string
	// SecretURI is ate-secret://plural.sh/instances/<id>/<kind>[/<host>]. The credential provider returns the
	// complete header value (console's header_format applied), so Prefix is empty for these rules.
	SecretURI string
	// ActorJWT injects a Substrate-minted actor JWT instead of a secret.
	ActorJWT bool

	// Prefix is prepended to the credential (Substrate's CredentialHeader.prefix).
	Prefix string
	// ActorJWTAudiences and ActorJWTExpirationSeconds configure the actor JWT when ActorJWT is set.
	ActorJWTAudiences         []string
	ActorJWTExpirationSeconds int64

	// ExtraHeaders are further headers the rule replaces, each from its own secret. Substrate replaces a header
	// only when the request carries it, so a client picks its credential by the header it sends.
	ExtraHeaders []HeaderSecret
}

// EffectivePort is Port, or the scheme's default when it is unset.
func (r Rule) EffectivePort() int32 {
	switch {
	case r.Port != 0:
		return r.Port
	case r.Scheme == SchemeHTTP:
		return 80
	default:
		return 443
	}
}

// HeaderSecret replaces Header with the credential SecretURI resolves to.
type HeaderSecret struct {
	Header    string
	SecretURI string
}

// Builder accumulates rules unique by (host, port), the first rule for a host winning.
type Builder struct {
	rules []Rule
	seen  map[string]bool
}

// Policy returns the rules added so far.
func (b *Builder) Policy() Policy { return Policy{Rules: b.rules} }

// Add adds r unless a rule for its host and port exists.
func (b *Builder) Add(r Rule) {
	if r.Host == "" {
		return
	}
	r.Port = r.EffectivePort()
	key := fmt.Sprintf("%s:%d", r.Host, r.Port)
	if b.seen == nil {
		b.seen = map[string]bool{}
	}
	if b.seen[key] {
		return
	}
	b.seen[key] = true
	b.rules = append(b.rules, r)
}

// AddSCM adds the rules of SCM hosts: https with Authorization from .../scm/<host> and PRIVATE-TOKEN from
// .../scm-token/<host> on each host and its companions, plus the signed object-storage hosts they redirect to,
// without injection.
func (b *Builder) AddSCM(id string, hosts []string) {
	for _, raw := range hosts {
		host := CanonicalSCMHost(raw)
		if host == "" {
			continue
		}
		uri := SecretURI(id, KindSCM, host)
		extra := []HeaderSecret{{Header: PrivateTokenHeader, SecretURI: SecretURI(id, KindSCMToken, host)}}
		b.Add(Rule{Host: host, Scheme: SchemeHTTPS, InjectHeader: AuthorizationHeader, SecretURI: uri, ExtraHeaders: extra})
		for _, c := range scmCompanions[host] {
			b.Add(Rule{Host: c, Scheme: SchemeHTTPS, InjectHeader: AuthorizationHeader, SecretURI: uri, ExtraHeaders: extra})
		}
		for _, s := range signedStorageHosts[host] {
			b.Add(Rule{Host: s, Scheme: SchemeHTTPS})
		}
	}
}

// BuildGoldenPolicy is the SCM half of a runner's golden egress policy: the hosts of the repositories its golden
// boot clones, with their companions and signed storage, injecting the devbox's own SCM credentials through the
// runner's golden pseudo-instance (GoldenInstanceID).
func BuildGoldenPolicy(runner string, repositories []string) Policy {
	b := &Builder{}
	b.AddSCM(GoldenInstanceID(runner), RepositoryHosts(repositories))
	return b.Policy()
}

// RepositoryHosts are the distinct SCM hosts of repository URLs, in order.
func RepositoryHosts(repositories []string) []string {
	var hosts []string
	for _, r := range repositories {
		host, _, _ := strings.Cut(scmpath.Normalize(r), "/")
		if host = CanonicalSCMHost(host); host != "" && !slices.Contains(hosts, host) {
			hosts = append(hosts, host)
		}
	}
	return hosts
}

// CanonicalRepo folds companion hosts into their primary host, so api.github.com/o/r and github.com/o/r match.
func CanonicalRepo(id string) string {
	host, path, ok := strings.Cut(id, "/")
	if !ok {
		return id
	}
	return CanonicalSCMHost(host) + "/" + path
}

// RepositoryAllowed reports whether repo is on allowed with the matching the ext_proc enforces; an empty allowlist
// allows every repository.
func RepositoryAllowed(allowed []string, repo string) bool {
	if len(allowed) == 0 {
		return true
	}
	id := CanonicalRepo(scmpath.Normalize(repo))
	for _, a := range allowed {
		if CanonicalRepo(scmpath.Normalize(a)) == id {
			return true
		}
	}
	return false
}

// ATE converts a policy to Substrate egress rules.
func ATE(p Policy) []*ateapi.EgressRule {
	out := make([]*ateapi.EgressRule, 0, len(p.Rules))
	for _, r := range p.Rules {
		ports := &ateapi.Ports{Numbers: []int32{r.EffectivePort()}}
		var effects *ateapi.HttpRuleEffects
		if r.InjectHeader != "" && (r.SecretURI != "" || r.ActorJWT) {
			h := &ateapi.CredentialHeader{Header: r.InjectHeader, Prefix: r.Prefix}
			if r.ActorJWT {
				h.ActorJwt = &ateapi.ActorJwtSource{Audiences: r.ActorJWTAudiences, ExpirationSeconds: r.ActorJWTExpirationSeconds}
			} else {
				h.CredentialUri = r.SecretURI
			}
			effects = &ateapi.HttpRuleEffects{ReplaceHeaders: []*ateapi.CredentialHeader{h}}
			for _, x := range r.ExtraHeaders {
				effects.ReplaceHeaders = append(effects.ReplaceHeaders, &ateapi.CredentialHeader{Header: x.Header, CredentialUri: x.SecretURI})
			}
		}
		hosts := []string{r.Host}
		switch r.Scheme {
		case SchemeHTTP:
			out = append(out, &ateapi.EgressRule{Http: &ateapi.HttpRule{Hostnames: hosts, Ports: ports, Effects: effects}})
		case SchemeTLSPassthrough:
			out = append(out, &ateapi.EgressRule{TlsPassthrough: &ateapi.TlsPassthroughRule{Hostnames: hosts, Ports: ports}})
		default:
			out = append(out, &ateapi.EgressRule{Https: &ateapi.HttpsRule{Hostnames: hosts, Ports: ports, Effects: effects}})
		}
	}
	return out
}
