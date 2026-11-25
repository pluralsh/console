package rules

import (
	"slices"
	"testing"
)

func TestRepositoryAllowed(t *testing.T) {
	cases := []struct {
		allowed []string
		repo    string
		want    bool
	}{
		{nil, "https://github.com/pluralsh/console", true},
		{[]string{"github.com/pluralsh/console"}, "https://github.com/pluralsh/console.git", true},
		{[]string{"https://GitHub.com/pluralsh/console"}, "git@github.com:pluralsh/console.git", true},
		{[]string{"github.com/pluralsh/console"}, "https://codeload.github.com/pluralsh/console", true},
		{[]string{"github.com/pluralsh/console"}, "https://github.com/pluralsh/plural", false},
	}
	for _, tc := range cases {
		if got := RepositoryAllowed(tc.allowed, tc.repo); got != tc.want {
			t.Errorf("RepositoryAllowed(%v, %s) = %v, want %v", tc.allowed, tc.repo, got, tc.want)
		}
	}
}

func TestBuildGoldenPolicy(t *testing.T) {
	repos := []string{"https://github.com/pluralsh/console", "git@github.com:pluralsh/plural.git", "https://gitlab.example.com/acme/api"}
	if got := RepositoryHosts(repos); !slices.Equal(got, []string{"github.com", "gitlab.example.com"}) {
		t.Fatalf("RepositoryHosts = %v", got)
	}

	p := BuildGoldenPolicy("platform", repos)
	byHost := map[string]Rule{}
	for _, r := range p.Rules {
		if _, dup := byHost[r.Host]; dup {
			t.Fatalf("two rules for %s", r.Host)
		}
		byHost[r.Host] = r
	}
	for host, uri := range map[string]string{
		"github.com":         "ate-secret://plural.sh/instances/golden.platform/scm/github.com",
		"api.github.com":     "ate-secret://plural.sh/instances/golden.platform/scm/github.com",
		"gitlab.example.com": "ate-secret://plural.sh/instances/golden.platform/scm/gitlab.example.com",
	} {
		r, ok := byHost[host]
		if !ok || r.SecretURI != uri || r.InjectHeader != AuthorizationHeader {
			t.Errorf("%s rule = %+v, want Authorization from %s", host, r, uri)
		}
	}
	if r := byHost["objects.githubusercontent.com"]; r.Host == "" || r.SecretURI != "" {
		t.Errorf("signed storage rule = %+v, want one without injection", r)
	}

	rules := ATE(p)
	if len(rules) != len(p.Rules) || rules[0].GetHttps().GetEffects().GetReplaceHeaders()[1].GetHeader() != PrivateTokenHeader {
		t.Fatalf("ATE rules = %v", rules)
	}
}
