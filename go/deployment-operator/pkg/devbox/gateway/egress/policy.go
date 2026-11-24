package egress

import (
	"fmt"
	"net"
	"os"
	"strconv"
	"strings"
	"sync"
)

const (
	defaultActorJWTExpiration = 900
	authorizationHeader       = "Authorization"
	bearerPrefix              = "Bearer "
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

// canonicalSCMHost maps a companion host to the connection host its token belongs to.
func canonicalSCMHost(host string) string {
	host = normalizeHost(host)
	for primary, companions := range scmCompanions {
		for _, c := range companions {
			if c == host {
				return primary
			}
		}
	}
	return host
}

var (
	defaultGatewayMu sync.RWMutex
	defaultGateway   GatewayEndpoint
)

// SetGatewayEndpoint sets the devbox MCP endpoint BuildPolicy uses for instances whose InstanceInfo.Gateway is
// zero. New calls it with Config.Gateway.
func SetGatewayEndpoint(ep GatewayEndpoint) {
	defaultGatewayMu.Lock()
	defer defaultGatewayMu.Unlock()
	defaultGateway = ep
}

func currentGatewayEndpoint() GatewayEndpoint {
	defaultGatewayMu.RLock()
	defer defaultGatewayMu.RUnlock()
	return defaultGateway
}

// URL is the base URL of the endpoint, e.g. http://devbox-gateway.ns.svc:8080.
func (ep GatewayEndpoint) URL() string {
	if ep.Host == "" {
		return ""
	}
	scheme, port := "http", ep.Port
	if ep.TLS {
		scheme = "https"
	}
	if port == 0 || (ep.TLS && port == 443) || (!ep.TLS && port == 80) {
		return scheme + "://" + ep.Host
	}
	return scheme + "://" + net.JoinHostPort(ep.Host, strconv.Itoa(int(port)))
}

// JWTAudience is the audience egress mints actor JWTs for and the MCP requires.
func (ep GatewayEndpoint) JWTAudience() string {
	if ep.Audience != "" {
		return ep.Audience
	}
	return ep.URL()
}

// SecretURI is the credential URI for one of an instance's credentials. SCM URIs name the connection host.
func SecretURI(instanceID, kind, host string) string {
	uri := "ate-secret://" + CredentialProviderName + "/instances/" + instanceID + "/" + kind
	if host != "" {
		uri += "/" + host
	}
	return uri
}

// BuildPolicy turns an instance into its egress rules (section 4.4). It is a pure function of info (and of the
// default gateway endpoint when info.Gateway is zero), so the core can re-apply it whenever the box changes.
//
// Rules, in order, unique by (host, port) with the first rule for a host winning:
//   - SCM hosts and their companions (api.github.com, ...): https, Authorization from .../scm/<host> and
//     PRIVATE-TOKEN from .../scm-token/<host>; plus the signed object-storage hosts they redirect to, without
//     injection;
//   - the console host: https, Authorization from .../console. The AI proxy and the workbench MCP share the host
//     and the header, and Substrate decides one rule per host, so a separate .../ai-proxy rule is only emitted
//     when AIProxyHost is a different host;
//   - the devbox MCP on the gateway Service: http or https with an actor JWT;
//   - subscription billing: api.anthropic.com with Authorization from .../claude-oauth for Claude, and
//     chatgpt.com and auth.openai.com without injection for Codex (the bundle lives in the sandbox);
//   - cloud identity token-exchange and API hosts, without injection;
//   - the runner allowlist: https, or tls_passthrough where flagged.
func BuildPolicy(info InstanceInfo) Policy {
	b := &policyBuilder{seen: map[string]bool{}}
	id := info.InstanceID

	for _, raw := range info.SCMHosts {
		host := canonicalSCMHost(raw)
		if host == "" {
			continue
		}
		uri := SecretURI(id, KindSCM, host)
		extra := []HeaderSecret{{Header: PrivateTokenHeader, SecretURI: SecretURI(id, KindSCMToken, host)}}
		b.add(Rule{Host: host, Scheme: SchemeHTTPS, InjectHeader: authorizationHeader, SecretURI: uri, ExtraHeaders: extra})
		for _, c := range scmCompanions[host] {
			b.add(Rule{Host: c, Scheme: SchemeHTTPS, InjectHeader: authorizationHeader, SecretURI: uri, ExtraHeaders: extra})
		}
		for _, s := range signedStorageHosts[host] {
			b.add(Rule{Host: s, Scheme: SchemeHTTPS})
		}
	}

	if console := normalizeHost(info.ConsoleHost); console != "" {
		b.add(Rule{Host: console, Scheme: SchemeHTTPS, InjectHeader: authorizationHeader, SecretURI: SecretURI(id, KindConsole, "")})
	}
	if ai := normalizeHost(info.AIProxyHost); ai != "" {
		b.add(Rule{Host: ai, Scheme: SchemeHTTPS, InjectHeader: authorizationHeader, SecretURI: SecretURI(id, KindAIProxy, "")})
	}

	ep := info.Gateway
	if ep.Host == "" {
		ep = currentGatewayEndpoint()
	}
	if host := normalizeHost(ep.Host); host != "" {
		scheme := SchemeHTTP
		if ep.TLS {
			scheme = SchemeHTTPS
		}
		exp := ep.ExpirationSeconds
		if exp == 0 {
			exp = defaultActorJWTExpiration
		}
		gateway := Rule{
			Host:                      host,
			Port:                      ep.Port,
			Scheme:                    scheme,
			InjectHeader:              authorizationHeader,
			Prefix:                    bearerPrefix,
			ActorJWT:                  true,
			ActorJWTAudiences:         []string{ep.JWTAudience()},
			ActorJWTExpirationSeconds: exp,
		}
		b.add(gateway)
		// Substrate's sandbox DNS only forwards names the policy allows, exactly. Cluster DNS answers a Service
		// only by its full name, which resolvers reach through the search list, so that name needs a rule too.
		if fqdn := serviceFQDN(host); fqdn != "" {
			gateway.Host = fqdn
			b.add(gateway)
		}
	}

	if subscriptionBilling(info.AgentBilling, "claude") {
		b.add(Rule{Host: "api.anthropic.com", Scheme: SchemeHTTPS, InjectHeader: authorizationHeader, SecretURI: SecretURI(id, KindClaudeOAuth, "")})
	}
	if subscriptionBilling(info.AgentBilling, "codex") {
		b.add(Rule{Host: "chatgpt.com", Scheme: SchemeHTTPS})
		b.add(Rule{Host: "auth.openai.com", Scheme: SchemeHTTPS})
	}

	for _, h := range info.CloudIdentityHosts {
		b.add(Rule{Host: normalizeHost(h), Scheme: SchemeHTTPS})
	}

	for _, e := range info.HTTPAllowlist {
		scheme := SchemeHTTPS
		if e.Passthrough {
			scheme = SchemeTLSPassthrough
		}
		b.add(Rule{Host: normalizeHost(e.Host), Port: e.Port, Scheme: scheme})
	}

	return Policy{Rules: b.rules}
}

type policyBuilder struct {
	rules []Rule
	seen  map[string]bool
}

func (b *policyBuilder) add(r Rule) {
	if r.Host == "" {
		return
	}
	r.Port = r.EffectivePort()
	key := fmt.Sprintf("%s:%d", r.Host, r.Port)
	if b.seen[key] {
		return
	}
	b.seen[key] = true
	b.rules = append(b.rules, r)
}

// subscriptionBilling reports whether agent ("claude" or "codex") bills through the user's own plan.
func subscriptionBilling(billing map[string]string, agent string) bool {
	for k, v := range billing {
		if normalizeAgent(k) == agent && normalizeBilling(v) == "subscription" {
			return true
		}
	}
	return false
}

func normalizeAgent(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	s = strings.TrimPrefix(s, "agent_type_")
	switch s {
	case "claude", "claude_code", "claude-code", "claudecode", "claude-agent-acp":
		return "claude"
	case "codex", "codex-acp":
		return "codex"
	}
	return s
}

func normalizeBilling(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	return strings.TrimPrefix(s, "billing_mode_")
}

// serviceFQDN is a `<svc>.<ns>.svc` host's fully qualified name in the cluster's DNS domain, or "".
func serviceFQDN(host string) string {
	if !strings.HasSuffix(host, ".svc") {
		return ""
	}
	return host + "." + clusterDomain()
}

// clusterDomain is the cluster's DNS domain, read from the `svc.<domain>` entry of the pod's resolv.conf search
// list.
var clusterDomain = sync.OnceValue(func() string {
	data, _ := os.ReadFile("/etc/resolv.conf")
	return clusterDomainOf(string(data))
})

func clusterDomainOf(resolvConf string) string {
	for _, line := range strings.Split(resolvConf, "\n") {
		fields := strings.Fields(line)
		if len(fields) == 0 || fields[0] != "search" {
			continue
		}
		for _, d := range fields[1:] {
			if domain, ok := strings.CutPrefix(strings.TrimSuffix(d, "."), "svc."); ok && domain != "" {
				return domain
			}
		}
	}
	return "cluster.local"
}

// normalizeHost lowercases a host and strips any scheme, path, port and trailing dot.
func normalizeHost(h string) string {
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
