package main

import (
	"context"
	"fmt"
	"os"
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

// startSCMCredentialsRefresh keeps the token used by this sidecar's SCM tools
// current. The deploy-token client is required because scmCreds is only
// resolved for the runner cluster; the run's Plural credentials cannot sideload it.
func startSCMCredentialsRefresh(ctx context.Context, client agentRunFetcher, runID string, interval time.Duration) {
	go func() {
		ticker := time.NewTicker(interval)
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				if err := refreshSCMCredentials(ctx, client, runID); err != nil {
					klog.V(log.LogLevelDefault).ErrorS(err, "could not refresh SCM credentials")
				}
			}
		}
	}()
}

func refreshSCMCredentials(ctx context.Context, client agentRunFetcher, runID string) error {
	agentRun, err := client.GetAgentRun(ctx, runID)
	if err != nil {
		return fmt.Errorf("could not get agent run: %w", err)
	}
	if agentRun == nil || agentRun.ScmCreds == nil || agentRun.ScmCreds.Token == "" {
		return fmt.Errorf("agent run does not have scm creds")
	}

	if err := os.Setenv(environment.EnvGitAccessToken, agentRun.ScmCreds.Token); err != nil {
		return fmt.Errorf("could not set SCM access token: %w", err)
	}

	klog.V(log.LogLevelInfo).InfoS("refreshed SCM credentials")
	return nil
}
