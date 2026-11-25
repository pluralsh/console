package egress

import (
	"net"
	"os"
	"strconv"
	"strings"
	"sync"

	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/gateway/egress/rules"
)

const (
	defaultActorJWTExpiration = 900
	authorizationHeader       = rules.AuthorizationHeader
	bearerPrefix              = "Bearer "
	PrivateTokenHeader        = rules.PrivateTokenHeader
)

func canonicalSCMHost(host string) string { return rules.CanonicalSCMHost(host) }

func normalizeHost(h string) string { return rules.NormalizeHost(h) }

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
func SecretURI(instanceID, kind, host string) string { return rules.SecretURI(instanceID, kind, host) }

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
	b := &rules.Builder{}
	id := info.InstanceID

	b.AddSCM(id, info.SCMHosts)

	if console := normalizeHost(info.ConsoleHost); console != "" {
		b.Add(Rule{Host: console, Scheme: SchemeHTTPS, InjectHeader: authorizationHeader, SecretURI: SecretURI(id, KindConsole, "")})
	}
	if ai := normalizeHost(info.AIProxyHost); ai != "" {
		b.Add(Rule{Host: ai, Scheme: SchemeHTTPS, InjectHeader: authorizationHeader, SecretURI: SecretURI(id, KindAIProxy, "")})
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
		b.Add(gateway)
		// Substrate's sandbox DNS only forwards names the policy allows, exactly. Cluster DNS answers a Service
		// only by its full name, which resolvers reach through the search list, so that name needs a rule too.
		if fqdn := serviceFQDN(host); fqdn != "" {
			gateway.Host = fqdn
			b.Add(gateway)
		}
	}

	if subscriptionBilling(info.AgentBilling, "claude") {
		b.Add(Rule{Host: "api.anthropic.com", Scheme: SchemeHTTPS, InjectHeader: authorizationHeader, SecretURI: SecretURI(id, KindClaudeOAuth, "")})
	}
	if subscriptionBilling(info.AgentBilling, "codex") {
		b.Add(Rule{Host: "chatgpt.com", Scheme: SchemeHTTPS})
		b.Add(Rule{Host: "auth.openai.com", Scheme: SchemeHTTPS})
	}

	for _, h := range info.CloudIdentityHosts {
		b.Add(Rule{Host: normalizeHost(h), Scheme: SchemeHTTPS})
	}

	for _, e := range info.HTTPAllowlist {
		scheme := SchemeHTTPS
		if e.Passthrough {
			scheme = SchemeTLSPassthrough
		}
		b.Add(Rule{Host: normalizeHost(e.Host), Port: e.Port, Scheme: scheme})
	}

	return b.Policy()
}

// BuildGoldenPolicy is rules.BuildGoldenPolicy.
func BuildGoldenPolicy(runner string, repositories []string) Policy {
	return rules.BuildGoldenPolicy(runner, repositories)
}

// RepositoryHosts are the distinct SCM hosts of repository URLs, in order.
func RepositoryHosts(repositories []string) []string { return rules.RepositoryHosts(repositories) }

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
