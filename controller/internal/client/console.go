package client

import (
	"context"
	"net/http"

	console "github.com/pluralsh/console-client-go"

	"github.com/pluralsh/console/controller/api/v1alpha1"
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
	consoleClient console.ConsoleClient
}

type ConsoleClient interface {
	GetServices() ([]*console.ServiceDeploymentBaseFragment, error)
	GetService(clusterID, serviceName string) (*console.ServiceDeploymentExtended, error)
	UpdateComponents(id string, components []*console.ComponentAttributes, errs []*console.ServiceErrorAttributes) error
	CreateRepository(url string, privateKey, passphrase, username, password *string) (*console.CreateGitRepository, error)
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
	CreatePullRequest(ctx context.Context, prAutomationID string, branch *string, context *string) (*console.CreatePullRequest, error)
	GetNotificationSink(ctx context.Context, id string) (*console.NotificationSinkFragment, error)
	DeleteNotificationSink(ctx context.Context, id string) error
	UpsertNotificationSink(ctx context.Context, attr console.NotificationSinkAttributes) (*console.NotificationSinkFragment, error)
	GetNotificationSinkByName(ctx context.Context, name string) (*console.NotificationSinkFragment, error)
	DeleteNotificationRouter(ctx context.Context, id string) error
	GetNotificationRouterByName(ctx context.Context, name string) (*console.NotificationRouterFragment, error)
	GetNotificationRouter(ctx context.Context, id string) (*console.NotificationRouterFragment, error)
	UpsertNotificationRouter(ctx context.Context, attr console.NotificationRouterAttributes) (*console.NotificationRouterFragment, error)
	GetNamespace(ctx context.Context, id string) (*console.ManagedNamespaceFragment, error)
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
}

func New(url, token string) ConsoleClient {
	httpClient := http.Client{
		Transport: &authedTransport{
			token:   token,
			wrapped: http.DefaultTransport,
		},
	}

	return &client{
		consoleClient: console.NewClient(&httpClient, url, nil),
		ctx:           context.Background(),
	}
}
