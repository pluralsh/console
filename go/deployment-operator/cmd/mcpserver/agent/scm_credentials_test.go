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
	t.Setenv("HTTP_PROXY", "http://container-proxy.example.com:8080")
	t.Setenv("HTTPS_PROXY", "http://container-proxy.example.com:8080")
	pluralToken := "new-plural-token"
	noProxy := "github.internal"
	client := agentRunFetcherStub{
		agentRun: &consoleclient.AgentRunFragment{
			ScmCreds: &consoleclient.ScmCredentialFragment{
				Token: "new-token",
				Proxy: &consoleclient.ScmCredentialFragment_Proxy{
					Enabled: true,
					URL:     "http://proxy.example.com:8080",
					Noproxy: &noProxy,
				},
			},
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
	if proxy := os.Getenv("HTTP_PROXY"); proxy != "http://container-proxy.example.com:8080" {
		t.Fatalf("HTTP_PROXY = %q, want process environment unchanged", proxy)
	}
	if proxy := os.Getenv("HTTPS_PROXY"); proxy != "http://container-proxy.example.com:8080" {
		t.Fatalf("HTTPS_PROXY = %q, want process environment unchanged", proxy)
	}
	scmCredential, _ := credentials.scmCredential.Load().(scmCredential)
	if scmCredential.proxyURL != "http://proxy.example.com:8080" {
		t.Fatalf("proxy URL = %q, want configured proxy", scmCredential.proxyURL)
	}
	if scmCredential.noProxy != "github.internal" {
		t.Fatalf("no proxy = %q, want %q", scmCredential.noProxy, "github.internal")
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
