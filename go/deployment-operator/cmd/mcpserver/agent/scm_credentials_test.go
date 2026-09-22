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

func TestRefreshCredentials(t *testing.T) {
	t.Setenv(environment.EnvGitAccessToken, "old-token")
	pluralToken := "new-plural-token"
	client := agentRunFetcherStub{
		agentRun: &consoleclient.AgentRunFragment{
			ScmCreds:    &consoleclient.ScmCredentialFragment{Token: "new-token"},
			PluralCreds: &consoleclient.PluralCredsFragment{Token: &pluralToken},
		},
	}
	credentials := newCredentialStore("old-plural-token")

	if err := refreshCredentials(context.Background(), client, "run-id", credentials); err != nil {
		t.Fatalf("refreshCredentials() error = %v", err)
	}
	if token := os.Getenv(environment.EnvGitAccessToken); token != "new-token" {
		t.Fatalf("GIT_ACCESS_TOKEN = %q, want %q", token, "new-token")
	}
	if token := credentials.PluralToken(); token != pluralToken {
		t.Fatalf("PluralToken() = %q, want %q", token, pluralToken)
	}
}

func TestRefreshCredentialsRequiresSCMCreds(t *testing.T) {
	pluralToken := "new-plural-token"
	credentials := newCredentialStore("old-plural-token")
	err := refreshCredentials(context.Background(), agentRunFetcherStub{
		agentRun: &consoleclient.AgentRunFragment{
			PluralCreds: &consoleclient.PluralCredsFragment{Token: &pluralToken},
		},
	}, "run-id", credentials)

	if err == nil {
		t.Fatal("refreshCredentials() error = nil, want missing SCM creds error")
	}
	if token := credentials.PluralToken(); token != pluralToken {
		t.Fatalf("PluralToken() = %q, want %q despite missing SCM creds", token, pluralToken)
	}
}

func TestRefreshCredentialsRequiresPluralCreds(t *testing.T) {
	t.Setenv(environment.EnvGitAccessToken, "old-token")
	err := refreshCredentials(context.Background(), agentRunFetcherStub{
		agentRun: &consoleclient.AgentRunFragment{
			ScmCreds: &consoleclient.ScmCredentialFragment{Token: "new-token"},
		},
	}, "run-id", newCredentialStore("old-token"))

	if err == nil {
		t.Fatal("refreshCredentials() error = nil, want missing Plural creds error")
	}
	if token := os.Getenv(environment.EnvGitAccessToken); token != "new-token" {
		t.Fatalf("GIT_ACCESS_TOKEN = %q, want %q despite missing Plural creds", token, "new-token")
	}
}

func TestRefreshCredentialsReturnsFetchError(t *testing.T) {
	want := errors.New("request failed")
	err := refreshCredentials(
		context.Background(),
		agentRunFetcherStub{err: want},
		"run-id",
		newCredentialStore("old-token"),
	)

	if !errors.Is(err, want) {
		t.Fatalf("refreshCredentials() error = %v, want wrapped %v", err, want)
	}
}
