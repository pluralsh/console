package client

import (
	"context"
	"net/http"

	console "github.com/pluralsh/console/go/client"

	"github.com/pluralsh/deployment-operator/api/v1alpha1"
	"github.com/pluralsh/deployment-operator/internal/helpers"
	v1 "github.com/pluralsh/deployment-operator/pkg/harness/stackrun/v1"
)

type NamespaceVersion struct {
	Namespace string
	Version   string
	PartOf    string
}

type client struct {
	ctx           context.Context
	consoleClient console.ConsoleClient
	url           string
	token         string
}

func (c *client) GetCredentials() (url, token string) {
	return c.url, c.token
}

func New(url, token string) Client {
	return &client{
		consoleClient: console.NewClient(&http.Client{
			Transport: helpers.NewAuthorizationTokenTransport(token),
		}, url, nil, console.PersistedQueryInterceptor),
		ctx:   context.Background(),
		url:   url,
		token: token,
	}
}

type Client interface {
	GetCredentials() (url, token string)
	PingCluster(attributes console.ClusterPing) error
	Ping(vsn string) error
	RegisterRuntimeServices(svcs map[string]NamespaceVersion, deprecated []console.DeprecatedCustomResourceAttributes, serviceId *string, serviceMesh *console.ServiceMesh) error
	UpsertVirtualCluster(parentID string, attributes console.ClusterAttributes) (*console.GetClusterWithToken_Cluster, error)
	IsClusterExists(id string) (bool, error)
	GetCluster(id string) (*console.TinyClusterFragment, error)
	MyCluster() (*console.MyCluster, error)
	DetachCluster(id string) error
	GetClusterRestore(id string) (*console.ClusterRestoreFragment, error)
	UpdateClusterRestore(id string, attrs console.RestoreAttributes) (*console.ClusterRestoreFragment, error)
	SaveClusterBackup(attrs console.BackupAttributes) (*console.ClusterBackupFragment, error)
	GetClusterBackup(clusterID, namespace, name string) (*console.ClusterBackupFragment, error)
	GetServices(after *string, first *int64) (*console.PagedClusterServicesForAgent, error)
	GetService(id string) (*console.ServiceDeploymentForAgent, error)
	GetServiceDeploymentComponents(id string) (*console.GetServiceDeploymentComponents_ServiceDeployment, error)
	UpdateComponents(id, revisionID string, sha *string, components []*console.ComponentAttributes, errs []*console.ServiceErrorAttributes, metadata *console.ServiceMetadataAttributes) error
	UpdateServiceErrors(id string, errs []*console.ServiceErrorAttributes) error
	ParsePipelineGateCR(pgFragment *console.PipelineGateFragment, operatorNamespace string) (*v1alpha1.PipelineGate, error)
	GateExists(id string) bool
	GetClusterGate(id string) (*console.PipelineGateFragment, error)
	GetClusterGates(after *string, first *int64) (*console.PagedClusterGateIDs, error)
	UpdateGate(id string, attributes console.GateUpdateAttributes) error
	UpsertConstraints(constraints []console.PolicyConstraintAttributes) (*console.UpsertPolicyConstraints, error)
	GetNamespace(id string) (*console.ManagedNamespaceFragment, error)
	ListNamespaces(after *string, first *int64) (*console.ListClusterNamespaces_ClusterManagedNamespaces, error)
	GetStackRunBase(id string) (*v1.StackRun, error)
	GetStackRun(id string) (*console.StackRunMinimalFragment, error)
	GetStackRunApprovedAt(id string) (*console.GetStackRunApprovedAt_StackRun, error)
	AddStackRunLogs(id, logs string) error
	CompleteStackRun(id string, attributes console.StackRunAttributes) error
	UpdateStackRun(id string, attributes console.StackRunAttributes) error
	UpdateStackRunStep(id string, attributes console.RunStepAttributes) error
	ListClusterStackRuns(after *string, first *int64) (*console.ListClusterMinimalStacks_ClusterStackRuns, error)
	GetUser(email string) (*console.UserFragment, error)
	GetGroup(name string) (*console.GroupFragment, error)
	SaveUpgradeInsights(attributes []*console.UpgradeInsightAttributes, addons []*console.CloudAddonAttributes) (*console.SaveUpgradeInsights, error)
	UpsertVulnerabilityReports(vulnerabilities []*console.VulnerabilityReportAttributes) (*console.UpsertVulnerabilities, error)
	IngestClusterCost(attr console.CostIngestAttributes) (*console.IngestClusterCost, error)
	GetAgentRuntime(ctx context.Context, id string) (*console.AgentRuntimeFragment, error)
	IsAgentRuntimeExists(ctx context.Context, name, clusterID string) (bool, error)
	GetAgentRuntimeByName(ctx context.Context, name, clusterID string) (*console.AgentRuntimeFragment, error)
	UpsertAgentRuntime(ctx context.Context, attrs console.AgentRuntimeAttributes) (*console.AgentRuntimeFragment, error)
	DeleteAgentRuntime(ctx context.Context, id string) error
	ListAgentRuntime(ctx context.Context, after *string, first *int64, q *string, typeArg *console.AgentRuntimeType) (*console.ListAgentRuntimes_AgentRuntimes, error)
	ListAgentRuntimePendingRuns(ctx context.Context, id string, after *string, first *int64) (*console.ListAgentRuntimePendingRuns_AgentRuntime_PendingRuns, error)
	IsAgentRunExists(ctx context.Context, id string) (bool, error)
	GetAgentRun(ctx context.Context, id string) (*console.AgentRunFragment, error)
	GetAgentRunTodos(ctx context.Context, id string) ([]*console.AgentTodoFragment, error)
	CancelAgentRun(ctx context.Context, id string) error
	CreateAgentRun(ctx context.Context, runtimeID string, attrs console.AgentRunAttributes) (*console.AgentRunFragment, error)
	UpdateAgentRun(ctx context.Context, id string, attrs console.AgentRunStatusAttributes) (*console.AgentRunFragment, error)
	UpdateAgentRunAnalysis(ctx context.Context, runtimeID string, attrs console.AgentAnalysisAttributes) (*console.AgentRunBaseFragment, error)
	UpdateAgentRunTodos(ctx context.Context, id string, attrs []*console.AgentTodoAttributes) (*console.AgentRunBaseFragment, error)
	CreateAgentPullRequest(ctx context.Context, runID string, attrs console.AgentPullRequestAttributes) (*console.PullRequestFragment, error)
	GetSentinelRunJob(id string) (*console.SentinelRunJobFragment, error)
	ListClusterSentinelRunJobs(after *string, first *int64) (*console.ListClusterSentinelRunJobs_ClusterSentinelRunJobs, error)
	UpdateSentinelRunJobStatus(id string, attr *console.SentinelRunJobUpdateAttributes) error
	CreateAgentMessage(ctx context.Context, runID string, attrs console.AgentMessageAttributes) (*console.CreateAgentMessage_CreateAgentMessage, error)
	Me() (*console.Me_Me, error)
	GetClusterByHandle(name string) (*console.TinyClusterFragment, error)
	CreateCluster(attrs console.ClusterAttributes) (*console.CreateCluster, error)
	GetDeployToken(clusterId, clusterName *string) (string, error)
	GetUserId(email string) (string, error)
	GetGroupId(name string) (string, error)
	UpdateCluster(id string, attrs console.ClusterUpdateAttributes) error
}
