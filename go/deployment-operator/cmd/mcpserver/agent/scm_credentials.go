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
	"k8s.io/klog/v2"
)

const scmCredentialsRefreshInterval = 30 * time.Minute

type agentRunFetcher interface {
	GetAgentRun(context.Context, string) (*consoleclient.AgentRunFragment, error)
}

type credentialStore struct {
	pluralToken atomic.Value
}

func newCredentialStore(pluralToken string) *credentialStore {
	store := &credentialStore{}
	store.pluralToken.Store(pluralToken)
	return store
}

func (s *credentialStore) PluralToken() string {
	token, _ := s.pluralToken.Load().(string)
	return token
}

func (s *credentialStore) updatePluralToken(agentRun *consoleclient.AgentRunFragment) error {
	if agentRun == nil || agentRun.PluralCreds == nil || agentRun.PluralCreds.Token == nil ||
		strings.TrimSpace(*agentRun.PluralCreds.Token) == "" {
		return fmt.Errorf("agent run does not have plural creds")
	}
	s.pluralToken.Store(*agentRun.PluralCreds.Token)
	return nil
}

func updateSCMCredentials(agentRun *consoleclient.AgentRunFragment) error {
	if agentRun == nil || agentRun.ScmCreds == nil || agentRun.ScmCreds.Token == "" {
		return fmt.Errorf("agent run does not have scm creds")
	}
	if err := os.Setenv(environment.EnvGitAccessToken, agentRun.ScmCreds.Token); err != nil {
		return fmt.Errorf("could not set SCM access token: %w", err)
	}
	return nil
}

// startCredentialsRefresh keeps the credentials used by the sidecar's SCM
// tools and workbench MCP proxy current. The deploy-token client is required
// because scmCreds is only resolved for the runner cluster.
func startCredentialsRefresh(ctx context.Context, client agentRunFetcher, runID string, interval time.Duration, credentials *credentialStore) {
	go func() {
		ticker := time.NewTicker(interval)
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				if err := refreshCredentials(ctx, client, runID, credentials); err != nil {
					klog.V(log.LogLevelDefault).ErrorS(err, "could not refresh agent credentials")
				}
			}
		}
	}()
}

func refreshCredentials(ctx context.Context, client agentRunFetcher, runID string, credentials *credentialStore) error {
	agentRun, err := client.GetAgentRun(ctx, runID)
	if err != nil {
		return fmt.Errorf("could not get agent run: %w", err)
	}
	if credentials == nil {
		return fmt.Errorf("credential store is not configured")
	}
	err = errors.Join(
		updateSCMCredentials(agentRun),
		credentials.updatePluralToken(agentRun),
	)
	if err != nil {
		return err
	}
	klog.V(log.LogLevelInfo).InfoS("refreshed agent credentials")
	return nil
}
