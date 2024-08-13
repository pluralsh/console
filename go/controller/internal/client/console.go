package client

import (
	"context"
	"net/http"

	console "github.com/pluralsh/console/go/client"

	"github.com/pluralsh/console/go/controller/api/v1alpha1"
	"github.com/pluralsh/console/go/controller/internal/credentials"
)

type authedTransport struct {
	token   string
	wrapped http.RoundTripper
}

func (t *authedTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	req.Header.Set("Authorization", "Token "+t.token)
	return t.wrapped.RoundTrip(req)
}

type client struct {
	ctx           context.Context
	url           string
	consoleClient console.ConsoleClient
}

type ConsoleClient interface {
	GetServices() ([]*console.ServiceDeploymentBaseFragment, error)
	GetService(clusterID, serviceName string) (*console.ServiceDeploymentExtended, error)
	CreateRepository(url string, privateKey, passphrase, username, password *string) (*console.CreateGitRepository, error)
	CreateGitRepository(attrs console.GitAttributes) (*console.CreateGitRepository, error)
	ListRepositories() (*console.ListGitRepositories, error)
	UpdateRepository(id string, attrs console.GitAttributes) (*console.UpdateGitRepository, error)
	DeleteRepository(id string) error
	GetRepository(url *string) (*console.GetGitRepository, error)
	CreateService(clusterId *string, attributes console.ServiceDeploymentAttributes) (*console.ServiceDeploymentExtended, error)
	GetCluster(id *string) (*console.ClusterFragment, error)
	GetClusterByHandle(handle *string) (*console.ClusterFragment, error)
	CreateCluster(attrs console.ClusterAttributes) (*console.ClusterFragment, error)
	UpdateCluster(id string, attrs console.ClusterUpdateAttributes) (*console.ClusterFragment, error)
	ListClusters() (*console.ListClusters, error)
	DeleteCluster(id string) (*console.ClusterFragment, error)
	IsClusterExisting(id *string) (bool, error)
	IsClusterDeleting(id *string) bool
	CreateProvider(ctx context.Context, attributes console.ClusterProviderAttributes) (*console.ClusterProviderFragment, error)
	GetProvider(ctx context.Context, id string) (*console.ClusterProviderFragment, error)
	GetProviderByCloud(ctx context.Context, cloud v1alpha1.CloudProvider) (*console.ClusterProviderFragment, error)
	UpdateProvider(ctx context.Context, id string, attributes console.ClusterProviderUpdateAttributes) (*console.ClusterProviderFragment, error)
	DeleteProvider(ctx context.Context, id string) error
	IsProviderExists(ctx context.Context, id string) (bool, error)
	IsProviderDeleting(ctx context.Context, id string) bool
	UpdateService(serviceId string, attributes console.ServiceUpdateAttributes) error
	DeleteService(serviceId string) error
	GetGlobalService(id string) (*console.GlobalServiceFragment, error)
	CreateGlobalService(serviceID string, attributes console.GlobalServiceAttributes) (*console.GlobalServiceFragment, error)
	CreateGlobalServiceFromTemplate(attributes console.GlobalServiceAttributes) (*console.GlobalServiceFragment, error)
	DeleteGlobalService(id string) error
	UpdateGlobalService(id string, attributes console.GlobalServiceAttributes) (*console.GlobalServiceFragment, error)
	SavePipeline(name string, attrs console.PipelineAttributes) (*console.PipelineFragment, error)
	DeletePipeline(id string) (*console.PipelineFragment, error)
	GetPipeline(id string) (*console.PipelineFragment, error)
	ListPipelines() (*console.GetPipelines, error)
	IsPipelineExisting(id string) (bool, error)
	GetUser(email string) (*console.UserFragment, error)
	GetGroup(name string) (*console.GroupFragment, error)
	GetServiceAccount(ctx context.Context, email string) (*console.UserFragment, error)
	CreateServiceAccount(ctx context.Context, attributes console.ServiceAccountAttributes) (*console.UserFragment, error)
	UpdateServiceAccount(ctx context.Context, id string, attributes console.ServiceAccountAttributes) (*console.UserFragment, error)
	DeleteServiceAccount(ctx context.Context, id string) error
	IsServiceAccountExists(ctx context.Context, email string) (bool, error)
	CreateServiceAccountToken(ctx context.Context, id string, scopes []*console.ScopeAttributes) (*console.AccessTokenFragment, error)
	CreateScmConnection(ctx context.Context, attributes console.ScmConnectionAttributes) (*console.ScmConnectionFragment, error)
	UpdateScmConnection(ctx context.Context, id string, attributes console.ScmConnectionAttributes) (*console.ScmConnectionFragment, error)
	DeleteScmConnection(ctx context.Context, id string) error
	GetScmConnection(ctx context.Context, id string) (*console.ScmConnectionFragment, error)
	GetScmConnectionByName(ctx context.Context, name string) (*console.ScmConnectionFragment, error)
	IsScmConnectionExists(ctx context.Context, name string) (bool, error)
	GetClusterBackup(clusterId, namespace, name *string) (*console.ClusterBackupFragment, error)
	GetClusterRestore(ctx context.Context, id string) (*console.ClusterRestoreFragment, error)
	UpdateClusterRestore(ctx context.Context, id string, attrs console.RestoreAttributes) (*console.ClusterRestoreFragment, error)
	CreateClusterRestore(ctx context.Context, backupId string) (*console.ClusterRestoreFragment, error)
	IsClusterRestoreExisting(ctx context.Context, id string) (bool, error)
	CreatePrAutomation(ctx context.Context, attributes console.PrAutomationAttributes) (*console.PrAutomationFragment, error)
	UpdatePrAutomation(ctx context.Context, id string, attributes console.PrAutomationAttributes) (*console.PrAutomationFragment, error)
	DeletePrAutomation(ctx context.Context, id string) error
	GetPrAutomation(ctx context.Context, id string) (*console.PrAutomationFragment, error)
	GetPrAutomationByName(ctx context.Context, name string) (*console.PrAutomationFragment, error)
	IsPrAutomationExists(ctx context.Context, id string) (bool, error)
	IsPrAutomationExistsByName(ctx context.Context, name string) (bool, error)
	GetServiceContext(name string) (*console.ServiceContextFragment, error)
	GetPipelineContext(ctx context.Context, id string) (*console.PipelineContextFragment, error)
	CreatePipelineContext(ctx context.Context, pipelineID string, attributes console.PipelineContextAttributes) (*console.CreatePipelineContext, error)
	CreatePullRequest(ctx context.Context, prAutomationID string, identifier, branch, context *string) (*console.CreatePullRequest, error)
	GetNotificationSink(ctx context.Context, id string) (*console.NotificationSinkFragment, error)
	DeleteNotificationSink(ctx context.Context, id string) error
	UpsertNotificationSink(ctx context.Context, attr console.NotificationSinkAttributes) (*console.NotificationSinkFragment, error)
	GetNotificationSinkByName(ctx context.Context, name string) (*console.NotificationSinkFragment, error)
	DeleteNotificationRouter(ctx context.Context, id string) error
	GetNotificationRouterByName(ctx context.Context, name string) (*console.NotificationRouterFragment, error)
	GetNotificationRouter(ctx context.Context, id string) (*console.NotificationRouterFragment, error)
	UpsertNotificationRouter(ctx context.Context, attr console.NotificationRouterAttributes) (*console.NotificationRouterFragment, error)
	GetNamespace(ctx context.Context, id string) (*console.ManagedNamespaceFragment, error)
	GetNamespaceByName(ctx context.Context, name string) (*console.ManagedNamespaceFragment, error)
	DeleteNamespace(ctx context.Context, id string) error
	CreateNamespace(ctx context.Context, attributes console.ManagedNamespaceAttributes) (*console.ManagedNamespaceFragment, error)
	UpdateNamespace(ctx context.Context, id string, attributes console.ManagedNamespaceAttributes) (*console.ManagedNamespaceFragment, error)
	GetStack(ctx context.Context, id string) (*console.InfrastructureStackFragment, error)
	DeleteStack(ctx context.Context, id string) error
	CreateStack(ctx context.Context, attributes console.StackAttributes) (*console.InfrastructureStackFragment, error)
	UpdateStack(ctx context.Context, id string, attributes console.StackAttributes) (*console.InfrastructureStackFragment, error)
	DetachStack(ctx context.Context, id string) error
	DetachService(serviceId string) error
	DeleteCustomStackRun(ctx context.Context, id string) error
	UpdateCustomStackRun(ctx context.Context, id string, attributes console.CustomStackRunAttributes) (*console.CustomStackRunFragment, error)
	CreateCustomStackRun(ctx context.Context, attributes console.CustomStackRunAttributes) (*console.CustomStackRunFragment, error)
	GetCustomStackRun(ctx context.Context, id string) (*console.CustomStackRunFragment, error)
	UpdateDeploymentSettings(ctx context.Context, attr console.DeploymentSettingsAttributes) (*console.UpdateDeploymentSettings, error)
	GetDeploymentSettings(ctx context.Context) (*console.DeploymentSettingsFragment, error)
	CreateProject(ctx context.Context, attributes console.ProjectAttributes) (*console.ProjectFragment, error)
	GetProject(ctx context.Context, id, name *string) (*console.ProjectFragment, error)
	UpdateProject(ctx context.Context, id string, attributes console.ProjectAttributes) (*console.ProjectFragment, error)
	IsProjectExists(ctx context.Context, name string) (bool, error)
	DeleteProject(ctx context.Context, id string) error
	UseCredentials(namespace string, credentialsCache credentials.NamespaceCredentialsCache) (string, error)
	CreateStackDefinition(ctx context.Context, attributes console.StackDefinitionAttributes) (*console.StackDefinitionFragment, error)
	UpdateStackDefinition(ctx context.Context, id string, attributes console.StackDefinitionAttributes) (*console.StackDefinitionFragment, error)
	DeleteStackDefinition(ctx context.Context, id string) error
	GetStackDefinition(ctx context.Context, id string) (*console.StackDefinitionFragment, error)
	IsStackDefinitionExists(ctx context.Context, id string) (bool, error)
	GetObservabilityProvider(ctx context.Context, id string) (*console.ObservabilityProviderFragment, error)
	UpsertObservabilityProvider(ctx context.Context, attributes console.ObservabilityProviderAttributes) (*console.ObservabilityProviderFragment, error)
	DeleteObservabilityProvider(ctx context.Context, id string) error
	IsObservabilityProviderExists(ctx context.Context, id string) (bool, error)
}

func New(url, token string) ConsoleClient {
	return &client{
		consoleClient: console.NewClient(NewHttpClient(token), url, nil),
		url:           url,
		ctx:           context.Background(),
	}
}

func NewHttpClient(token string) *http.Client {
	return &http.Client{Transport: &authedTransport{token: token, wrapped: http.DefaultTransport}}
}
