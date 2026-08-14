package main

import (
	"context"
	"errors"
	"os"
	"testing"

	consoleclient "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/environment"
)

type agentRunFetcherStub struct {
	agentRun *consoleclient.AgentRunFragment
	err      error
}

func (s agentRunFetcherStub) GetAgentRun(context.Context, string) (*consoleclient.AgentRunFragment, error) {
	return s.agentRun, s.err
}

func TestRefreshSCMCredentials(t *testing.T) {
	t.Setenv(environment.EnvGitAccessToken, "old-token")
	client := agentRunFetcherStub{
		agentRun: &consoleclient.AgentRunFragment{
			ScmCreds: &consoleclient.ScmCredentialFragment{Token: "new-token"},
		},
	}

	if err := refreshSCMCredentials(context.Background(), client, "run-id"); err != nil {
		t.Fatalf("refreshSCMCredentials() error = %v", err)
	}
	if token := os.Getenv(environment.EnvGitAccessToken); token != "new-token" {
		t.Fatalf("GIT_ACCESS_TOKEN = %q, want %q", token, "new-token")
	}
}

func TestRefreshSCMCredentialsRequiresSCMCreds(t *testing.T) {
	err := refreshSCMCredentials(context.Background(), agentRunFetcherStub{
		agentRun: &consoleclient.AgentRunFragment{},
	}, "run-id")

	if err == nil {
		t.Fatal("refreshSCMCredentials() error = nil, want missing SCM creds error")
	}
}

func TestRefreshSCMCredentialsReturnsFetchError(t *testing.T) {
	want := errors.New("request failed")
	err := refreshSCMCredentials(context.Background(), agentRunFetcherStub{err: want}, "run-id")

	if !errors.Is(err, want) {
		t.Fatalf("refreshSCMCredentials() error = %v, want wrapped %v", err, want)
	}
}
