package environment

import (
	"os"
	"path"
	"strings"
	"testing"

	console "github.com/pluralsh/console/go/client"
	v1 "github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/agentrun/v1"
)

func TestConfigureCodebaseMemoryGitExclude(t *testing.T) {
	repoDir := t.TempDir()
	excludePath := path.Join(repoDir, ".git", "info", "exclude")

	if err := configureCodebaseMemoryGitExclude(repoDir); err != nil {
		t.Fatalf("configureCodebaseMemoryGitExclude() failed: %v", err)
	}
	if err := configureCodebaseMemoryGitExclude(repoDir); err != nil {
		t.Fatalf("configureCodebaseMemoryGitExclude() second call failed: %v", err)
	}

	contents, err := os.ReadFile(excludePath)
	if err != nil {
		t.Fatalf("failed to read exclude file: %v", err)
	}

	if count := strings.Count(string(contents), codebaseMemoryGitExcludePattern); count != 1 {
		t.Fatalf("expected one %q entry, got %d in %q", codebaseMemoryGitExcludePattern, count, contents)
	}
}

func TestCommitIdentityPrefersInitiatingUser(t *testing.T) {
	env := &environment{
		agentRun: &v1.AgentRun{
			User: &v1.AgentUser{
				Name:  "Ada Lovelace",
				Email: "ada@example.com",
			},
			ScmCreds: &console.ScmCredentialFragment{Username: "scm-bot"},
		},
	}

	name, email := env.commitIdentity()

	if name != "Ada Lovelace" {
		t.Fatalf("expected initiating user's name, got %q", name)
	}
	if email != "ada@example.com" {
		t.Fatalf("expected initiating user's email, got %q", email)
	}
}

func TestCommitIdentityFallsBackToScmCredentials(t *testing.T) {
	env := &environment{
		agentRun: &v1.AgentRun{
			ScmCreds: &console.ScmCredentialFragment{Username: "scm-bot"},
		},
	}

	name, email := env.commitIdentity()

	if name != "scm-bot" {
		t.Fatalf("expected SCM username, got %q", name)
	}
	if email != "agent@plural.sh" {
		t.Fatalf("expected fallback email, got %q", email)
	}
}
