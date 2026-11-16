package egress

import (
	"encoding/json"
	"flag"
	"os"
	"path/filepath"
	"testing"
)

var update = flag.Bool("update", false, "rewrite golden files")

func testGateway() GatewayEndpoint {
	return GatewayEndpoint{Host: "devbox-gateway.plrl-deploy-operator.svc", Port: 8080}
}

func TestBuildPolicyGolden(t *testing.T) {
	cases := []struct {
		name string
		info InstanceInfo
	}{
		{
			name: "minimal",
			info: InstanceInfo{InstanceID: "i-1", Gateway: testGateway()},
		},
		{
			name: "proxy_billing",
			info: InstanceInfo{
				InstanceID:   "i-2",
				SCMHosts:     []string{"github.com", "https://gitlab.example.com/"},
				ConsoleHost:  "console.example.com",
				AgentBilling: map[string]string{"claude": "proxy", "AGENT_TYPE_CODEX": "BILLING_MODE_PROXY"},
				HTTPAllowlist: []AllowEntry{
					{Host: "pypi.org"},
					{Host: "registry.npmjs.org", Port: 8443},
					{Host: "db.internal.example.com", Port: 5432, Passthrough: true},
				},
				Gateway: testGateway(),
			},
		},
		{
			name: "subscription_billing",
			info: InstanceInfo{
				InstanceID:         "i-3",
				SCMHosts:           []string{"api.github.com", "bitbucket.org"},
				ConsoleHost:        "console.example.com",
				AIProxyHost:        "ai.example.com",
				AgentBilling:       map[string]string{"AGENT_TYPE_CLAUDE": "BILLING_MODE_SUBSCRIPTION", "codex": "subscription"},
				CloudIdentityHosts: []string{"sts.amazonaws.com", "STS.AMAZONAWS.COM"},
				// duplicates of earlier rules are dropped, first one wins
				HTTPAllowlist: []AllowEntry{{Host: "api.anthropic.com"}, {Host: "github.com"}},
				Gateway: GatewayEndpoint{
					Host: "devbox-gateway.plrl.svc", Port: 443, TLS: true, Audience: "devbox-mcp", ExpirationSeconds: 600,
				},
			},
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, err := json.MarshalIndent(BuildPolicy(tc.info), "", "  ")
			if err != nil {
				t.Fatal(err)
			}
			got = append(got, '\n')
			path := filepath.Join("testdata", "policy_"+tc.name+".golden.json")
			if *update {
				if err := os.MkdirAll("testdata", 0o755); err != nil {
					t.Fatal(err)
				}
				if err := os.WriteFile(path, got, 0o644); err != nil {
					t.Fatal(err)
				}
			}
			want, err := os.ReadFile(path)
			if err != nil {
				t.Fatalf("read golden (run with -update): %v", err)
			}
			if string(got) != string(want) {
				t.Errorf("policy mismatch for %s\n--- got\n%s\n--- want\n%s", tc.name, got, want)
			}
		})
	}
}

func TestBuildPolicyDefaultGateway(t *testing.T) {
	prev := currentGatewayEndpoint()
	t.Cleanup(func() { SetGatewayEndpoint(prev) })

	SetGatewayEndpoint(GatewayEndpoint{Host: "gw.ns.svc", Port: 8080})
	p := BuildPolicy(InstanceInfo{InstanceID: "i"})
	if len(p.Rules) != 1 {
		t.Fatalf("want 1 rule, got %+v", p.Rules)
	}
	r := p.Rules[0]
	if !r.ActorJWT || r.Scheme != SchemeHTTP || r.Port != 8080 || r.Prefix != "Bearer " ||
		len(r.ActorJWTAudiences) != 1 || r.ActorJWTAudiences[0] != "http://gw.ns.svc:8080" ||
		r.ActorJWTExpirationSeconds != defaultActorJWTExpiration {
		t.Fatalf("unexpected gateway rule %+v", r)
	}
}

func TestSubscriptionOnlyAddsAnthropicForClaude(t *testing.T) {
	p := BuildPolicy(InstanceInfo{InstanceID: "i", AgentBilling: map[string]string{"codex": "subscription"}})
	for _, r := range p.Rules {
		if r.Host == "api.anthropic.com" {
			t.Fatalf("codex subscription must not inject claude oauth: %+v", r)
		}
	}
}
