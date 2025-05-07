defmodule Console.GraphQl.Resolvers.Deployments do
  use Console.GraphQl.Resolvers.Base, model: Console.Schema.Cluster
  import Console.Deployments.Policies, only: [allow: 3]
  import Console.GraphQl.Resolvers.Deployments.Base
  alias Console.Deployments.{
    Clusters,
    Services,
    Pipelines,
    AddOns,
    Stacks,
    Settings,
    Git,
    Flows
  }
  alias Console.Schema.{
    Cluster,
    ClusterNodePool,
    Revision,
    ClusterProvider,
    Service,
    ServiceComponent,
    GitRepository,
    PolicyBinding,
    ApiDeprecation,
    Tag,
    GlobalService,
    ServiceError,
    ProviderCredential,
    Pipeline,
    PipelineStage,
    PipelineGate,
    PipelineEdge,
    StageService,
    PipelinePromotion,
    PromotionCriteria,
    PromotionService,
    ComponentContent,
    ScmConnection,
    PrAutomation,
    ServiceContext,
    ClusterRestore,
    ClusterBackup,
    ObjectStore,
    PullRequest,
    PipelinePullRequest,
    PipelineContext,
    NotificationSink,
    NotificationRouter,
    NotificationFilter,
    RouterFilter,
    PolicyConstraint,
    ConstraintViolation,
    ManagedNamespace,
    NamespaceInstance,
    NamespaceCluster,
    ServiceTemplate,
    Stack,
    StackRun,
    RunStep,
    RunLog,
    StackEnvironment,
    StackFile,
    StackOutput,
    StackState,
    ServiceDependency,
    Project,
    ServiceImport,
    StackDefinition,
    StackCron,
    ObservableMetric,
    ObservabilityProvider,
    UpgradeInsight,
    UpgradeInsightDetail,
    Catalog,
    AiInsight,
    ServiceVuln,
    NamespaceVuln,
    VulnerabilityReport,
    Vulnerability,
    ClusterInsightComponent,
    ServiceConfiguration,
    CloudAddon,
    ClusterScalingRecommendation,
    StackPolicyViolation,
    StackViolationCause,
    Alert,
    AlertResolution,
    Flow,
    McpServer,
    DeprecatedCustomResource,
    ServiceComponentChild,
    OperationalLayout,
    PreviewEnvironmentInstance,
    PreviewEnvironmentTemplate
  }

  def query(Project, _), do: Project
  def query(Pipeline, _), do: Pipeline
  def query(PipelineStage, _), do: PipelineStage
  def query(PipelineEdge, _), do: PipelineEdge
  def query(PipelineGate, _), do: PipelineGate
  def query(StageService, _), do: StageService
  def query(PipelinePromotion, _), do: PipelinePromotion
  def query(PromotionCriteria, _), do: PromotionCriteria
  def query(PromotionService, _), do: PromotionService
  def query(ServiceError, _), do: ServiceError
  def query(ProviderCredential, _), do: ProviderCredential
  def query(Tag, _), do: Tag
  def query(GlobalService, _), do: GlobalService
  def query(ApiDeprecation, _), do: ApiDeprecation
  def query(ClusterNodePool, _), do: ClusterNodePool
  def query(ClusterProvider, _), do: ClusterProvider
  def query(PolicyBinding, _), do: PolicyBinding
  def query(Service, _), do: Service
  def query(Revision, _), do: Revision
  def query(ServiceComponent, _), do: ServiceComponent
  def query(GitRepository, _), do: GitRepository
  def query(ComponentContent, _), do: ComponentContent
  def query(ScmConnection, _), do: ScmConnection
  def query(ServiceContext, _), do: ServiceContext
  def query(PrAutomation, _), do: PrAutomation
  def query(ClusterRestore, _), do: ClusterRestore
  def query(ClusterBackup, _), do: ClusterBackup
  def query(ObjectStore, _), do: ObjectStore
  def query(PullRequest, _), do: PullRequest
  def query(PipelineContext, _), do: PipelineContext
  def query(PipelinePullRequest, _), do: PipelinePullRequest
  def query(NotificationSink, _), do: NotificationSink
  def query(NotificationRouter, _), do: NotificationRouter
  def query(NotificationFilter, _), do: NotificationFilter
  def query(RouterFilter, _), do: RouterFilter
  def query(PolicyConstraint, _), do: PolicyConstraint
  def query(ConstraintViolation, _), do: ConstraintViolation
  def query(ManagedNamespace, _), do: ManagedNamespace
  def query(NamespaceInstance, _), do: NamespaceInstance
  def query(NamespaceCluster, _), do: NamespaceCluster
  def query(ServiceTemplate, _), do: ServiceTemplate
  def query(Stack, _), do: Stack
  def query(StackRun, _), do: StackRun
  def query(RunStep, _), do: RunStep
  def query(RunLog, _), do: RunLog
  def query(StackEnvironment, _), do: StackEnvironment
  def query(StackFile, _), do: StackFile
  def query(StackOutput, _), do: StackOutput
  def query(StackState, _), do: StackState
  def query(ServiceDependency, _), do: ServiceDependency
  def query(ServiceImport, _), do: ServiceImport
  def query(StackDefinition, _), do: StackDefinition
  def query(StackCron, _), do: StackCron
  def query(Catalog, _), do: Catalog
  def query(ObservableMetric, _), do: ObservableMetric
  def query(ObservabilityProvider, _), do: ObservabilityProvider
  def query(UpgradeInsight, _), do: UpgradeInsight
  def query(UpgradeInsightDetail, _), do: UpgradeInsightDetail
  def query(CloudAddon, _), do: CloudAddon
  def query(AiInsight, _), do: AiInsight
  def query(ServiceVuln, _), do: ServiceVuln
  def query(NamespaceVuln, _), do: NamespaceVuln
  def query(VulnerabilityReport, _), do: VulnerabilityReport
  def query(Vulnerability, _), do: Vulnerability
  def query(ClusterInsightComponent, _), do: ClusterInsightComponent
  def query(ServiceConfiguration, _), do: ServiceConfiguration
  def query(ClusterScalingRecommendation, _), do: ClusterScalingRecommendation
  def query(StackPolicyViolation, _), do: StackPolicyViolation
  def query(StackViolationCause, _), do: StackViolationCause
  def query(Alert, _), do: Alert
  def query(AlertResolution, _), do: AlertResolution
  def query(Flow, _), do: Flow
  def query(McpServer, _), do: McpServer
  def query(DeprecatedCustomResource, _), do: DeprecatedCustomResource
  def query(ServiceComponentChild, _), do: ServiceComponentChild
  def query(OperationalLayout, _), do: OperationalLayout
  def query(PreviewEnvironmentInstance, _), do: PreviewEnvironmentInstance
  def query(PreviewEnvironmentTemplate, _), do: PreviewEnvironmentTemplate
  def query(_, _), do: Cluster

  delegates Console.GraphQl.Resolvers.Deployments.Git
  delegates Console.GraphQl.Resolvers.Deployments.Cluster
  delegates Console.GraphQl.Resolvers.Deployments.Service
  delegates Console.GraphQl.Resolvers.Deployments.Pipeline
  delegates Console.GraphQl.Resolvers.Deployments.Backup
  delegates Console.GraphQl.Resolvers.Deployments.Notification
  delegates Console.GraphQl.Resolvers.Deployments.Policy
  delegates Console.GraphQl.Resolvers.Deployments.Observability
  delegates Console.GraphQl.Resolvers.Deployments.Global
  delegates Console.GraphQl.Resolvers.Deployments.Stack
  delegates Console.GraphQl.Resolvers.Deployments.Settings
  delegates Console.GraphQl.Resolvers.Deployments.OAuth
  delegates Console.GraphQl.Resolvers.Deployments.Flow

  def list_addons(_, _), do: AddOns.addons()

  def list_tags(args, _) do
    {order, field} = tag_args(args)
    Tag.cluster()
    |> tag_filters(args)
    |> Tag.ordered(order)
    |> Tag.select(field)
    |> Console.Repo.all()
    |> ok()
  end

  def search_tags(args, _) do
    tag_scope(args)
    |> tag_search_filters(args)
    |> Tag.ordered([asc: :name, asc: :value])
    |> paginate(args)
  end

  defp tag_scope(%{type: :stack}), do: Tag.stack()
  defp tag_scope(_), do: Tag.cluster()

  defp tag_search_filters(query, args) do
    Enum.reduce(args, query, fn
      {:tag, t}, q -> Tag.for_name(q, t)
      {:q, s}, q -> Tag.search(q, s)
      _, q -> q
    end)
  end

  defp tag_args(%{tag: _}), do: {[asc: :value], :value}
  defp tag_args(_), do: {[asc: :name], :name}

  def editable(resource, _, %{context: %{current_user: user}}) do
    case allow(resource, user, :write) do
      {:ok, _} -> {:ok, true}
      _ -> {:ok, false}
    end
  end
  def editable(_, _, _), do: {:ok, false}

  def install_addon(%{cluster_id: cluster_id} = args, %{context: %{current_user: user}}),
    do: AddOns.install(args, cluster_id, user)

  def rbac(%{rbac: rbac} = args, %{context: %{current_user: user}}) do
    {fun, id} = rbac_args(args)
    case fun.(rbac, id, user) do
      {:ok, _} -> {:ok, true}
      err -> err
    end
  end

  defp rbac_args(%{provider_id: prov_id}) when is_binary(prov_id), do: {&Clusters.provider_rbac/3, prov_id}
  defp rbac_args(%{cluster_id: id}) when is_binary(id), do: {&Clusters.rbac/3, id}
  defp rbac_args(%{service_id: id}) when is_binary(id), do: {&Services.rbac/3, id}
  defp rbac_args(%{pipeline_id: id}) when is_binary(id), do: {&Pipelines.rbac/3, id}
  defp rbac_args(%{stack_id: id}) when is_binary(id), do: {&Stacks.rbac/3, id}
  defp rbac_args(%{catalog_id: id}) when is_binary(id), do: {&Git.catalog_rbac/3, id}
  defp rbac_args(%{project_id: id}) when is_binary(id), do: {&Settings.project_rbac/3, id}
  defp rbac_args(%{flow_id: id}) when is_binary(id), do: {&Flows.rbac/3, id}
  defp rbac_args(%{server_id: id}) when is_binary(id), do: {&Flows.server_rbac/3, id}
end
