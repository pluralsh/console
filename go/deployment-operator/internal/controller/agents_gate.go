package controller

import (
	"context"
	"net/http"
	"strings"
	"sync"
	"time"

	console "github.com/pluralsh/console/go/client"
	"github.com/samber/lo"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	"github.com/pluralsh/console/go/deployment-operator/api/v1alpha1"
	"github.com/pluralsh/console/go/deployment-operator/internal/helpers"
	"github.com/pluralsh/console/go/deployment-operator/internal/utils"
)

const (
	AgentsNotAllowedReason  v1alpha1.ConditionReason = "AgentsNotAllowed"
	AgentsNotAllowedMessage string                   = "this cluster has not been configured to support agent workloads"

	requeueAgentsNotAllowed = 5 * time.Minute
	agentsGateTTL           = time.Minute
)

// AgentsGate reports whether console lets this cluster run agent workloads (AgentRuntimes and DevboxRunners).
type AgentsGate interface {
	AgentsEnabled(ctx context.Context) (bool, error)
}

// ConsoleAgentsGate reads the cluster's agentsEnabled from console, caching it for a minute.
type ConsoleAgentsGate struct {
	client console.ConsoleClient
	ttl    time.Duration

	mu        sync.Mutex
	enabled   bool
	fetchedAt time.Time
}

var _ AgentsGate = &ConsoleAgentsGate{}

func NewConsoleAgentsGate(consoleURL, deployToken string) *ConsoleAgentsGate {
	httpClient := &http.Client{Transport: helpers.NewAuthorizationTokenTransport(deployToken)}
	return &ConsoleAgentsGate{
		client: console.NewClient(httpClient, consoleURL, nil, console.PersistedQueryInterceptor, console.NewErrorInterceptor()),
		ttl:    agentsGateTTL,
	}
}

func (g *ConsoleAgentsGate) AgentsEnabled(ctx context.Context) (bool, error) {
	g.mu.Lock()
	defer g.mu.Unlock()

	if !g.fetchedAt.IsZero() && time.Since(g.fetchedAt) < g.ttl {
		return g.enabled, nil
	}

	res, err := g.client.MyClusterAgentsEnabled(ctx)
	switch {
	case err != nil && strings.Contains(err.Error(), "agentsEnabled"):
		// consoles predating the field don't gate agent workloads at all
		g.enabled = true
	case err != nil:
		return false, err
	default:
		g.enabled = lo.FromPtr(res.GetMyCluster().GetAgentsEnabled())
	}
	g.fetchedAt = time.Now()
	return g.enabled, nil
}

func markAgentsNotAllowed(set func(condition metav1.Condition)) {
	utils.MarkCondition(set, v1alpha1.ReadyConditionType, metav1.ConditionFalse, AgentsNotAllowedReason, AgentsNotAllowedMessage)
	utils.MarkCondition(set, v1alpha1.SynchronizedConditionType, metav1.ConditionFalse, AgentsNotAllowedReason, AgentsNotAllowedMessage)
}
