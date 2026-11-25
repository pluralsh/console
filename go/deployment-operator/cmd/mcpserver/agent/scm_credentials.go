package main

import (
	"context"
	"errors"
	"fmt"
	"os"
	"strings"
	"sync/atomic"
	"time"

	consoleclient "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/environment"
	"github.com/pluralsh/console/go/deployment-operator/pkg/log"
	"github.com/pluralsh/console/go/deployment-operator/pkg/scm"
	"k8s.io/klog/v2"
)

const (
	scmCredentialsRefreshInterval = 30 * time.Minute
	// scmCredentialsRefreshAhead is how long before a short-lived token (github app installation tokens) expires
	// it's replaced, so pushes never present an expired one.
	scmCredentialsRefreshAhead = 10 * time.Minute
	// scmCredentialsRetryInterval is the floor between refreshes, and the wait after a failed one.
	scmCredentialsRetryInterval = time.Minute
)

type agentRunFetcher interface {
	GetAgentRunCredentials(context.Context, string) (*consoleclient.AgentRunCredentialsFragment, error)
}

type credentialStore struct {
	pluralToken   atomic.Value
	scmCredential atomic.Value
}

type scmCredential struct {
	token     string
	proxyURL  string
	noProxy   string
	expiresAt time.Time
}

func newCredentialStore(pluralToken string) *credentialStore {
	store := &credentialStore{}
	store.pluralToken.Store(pluralToken)
	store.scmCredential.Store(scmCredential{})
	return store
}

func (s *credentialStore) PluralToken() string {
	token, _ := s.pluralToken.Load().(string)
	return token
}

func (s *credentialStore) updatePluralToken(agentRun *consoleclient.AgentRunCredentialsFragment) error {
	if agentRun == nil || agentRun.PluralCreds == nil || agentRun.PluralCreds.Token == nil ||
		strings.TrimSpace(*agentRun.PluralCreds.Token) == "" {
		return fmt.Errorf("agent run does not have plural creds")
	}
	s.pluralToken.Store(*agentRun.PluralCreds.Token)
	return nil
}

func (s *credentialStore) updateSCMCredentials(agentRun *consoleclient.AgentRunCredentialsFragment) error {
	if agentRun == nil || agentRun.ScmCreds == nil || agentRun.ScmCreds.Token == "" {
		return fmt.Errorf("agent run does not have scm creds")
	}
	if err := os.Setenv(environment.EnvGitAccessToken, agentRun.ScmCreds.Token); err != nil {
		return fmt.Errorf("could not set SCM access token: %w", err)
	}

	proxyURL, noProxy := scmProxy(agentRun)
	s.scmCredential.Store(scmCredential{
		token:     agentRun.ScmCreds.Token,
		proxyURL:  proxyURL,
		noProxy:   noProxy,
		expiresAt: scmExpiry(agentRun.ScmCreds),
	})
	return nil
}

func scmExpiry(creds *consoleclient.ScmCredentialFragment) time.Time {
	if creds.ExpiresAt == nil {
		return time.Time{}
	}
	t, err := time.Parse(time.RFC3339, *creds.ExpiresAt)
	if err != nil {
		klog.V(log.LogLevelDefault).ErrorS(err, "ignoring unparseable SCM token expiry", "expiresAt", *creds.ExpiresAt)
		return time.Time{}
	}
	return t
}

// nextRefresh is how long until the credentials should be refetched: the regular interval, or sooner when the SCM
// token expires before then.
func (s *credentialStore) nextRefresh(now time.Time, interval time.Duration) time.Duration {
	credential, _ := s.scmCredential.Load().(scmCredential)
	wait := interval
	if !credential.expiresAt.IsZero() {
		wait = min(wait, credential.expiresAt.Add(-scmCredentialsRefreshAhead).Sub(now))
	}
	return max(wait, scmCredentialsRetryInterval)
}

func (s *credentialStore) SCMClient() scm.Client {
	credential, _ := s.scmCredential.Load().(scmCredential)
	if credential.proxyURL == "" {
		return scm.NewClient(credential.token)
	}
	return scm.NewClient(credential.token, scm.WithHTTPProxy(credential.proxyURL, credential.noProxy))
}

func scmProxy(agentRun *consoleclient.AgentRunCredentialsFragment) (string, string) {
	if proxy := agentRun.ScmCreds.Proxy; proxy != nil && proxy.Enabled && strings.TrimSpace(proxy.URL) != "" {
		noProxy := ""
		if proxy.Noproxy != nil {
			noProxy = strings.TrimSpace(*proxy.Noproxy)
		}
		return strings.TrimSpace(proxy.URL), noProxy
	}

	return strings.TrimSpace(os.Getenv("PLRL_GIT_PROXY")), strings.TrimSpace(os.Getenv(environment.EnvNoProxy))
}

// startCredentialsRefresh keeps the credentials used by the sidecar's SCM
// tools and workbench MCP proxy current. The deploy-token client is required
// because scmCreds is only resolved for the runner cluster.
func startCredentialsRefresh(ctx context.Context, client agentRunFetcher, runID string, interval time.Duration, credentials *credentialStore) {
	go func() {
		timer := time.NewTimer(credentials.nextRefresh(time.Now(), interval))
		defer timer.Stop()

		for {
			select {
			case <-ctx.Done():
				return
			case <-timer.C:
				wait := scmCredentialsRetryInterval
				if err := refreshCredentials(ctx, client, runID, credentials); err != nil {
					klog.V(log.LogLevelDefault).ErrorS(err, "could not refresh agent credentials", "retryIn", wait)
				} else {
					wait = credentials.nextRefresh(time.Now(), interval)
				}
				timer.Reset(wait)
			}
		}
	}()
}

func refreshCredentials(ctx context.Context, client agentRunFetcher, runID string, credentials *credentialStore) error {
	agentRun, err := client.GetAgentRunCredentials(ctx, runID)
	if err != nil {
		return fmt.Errorf("could not get agent run credentials: %w", err)
	}
	if credentials == nil {
		return fmt.Errorf("credential store is not configured")
	}
	err = errors.Join(
		credentials.updateSCMCredentials(agentRun),
		credentials.updatePluralToken(agentRun),
	)
	if err != nil {
		return err
	}
	klog.V(log.LogLevelInfo).InfoS("refreshed agent credentials")
	return nil
}
