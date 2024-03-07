defmodule Console.GraphQl.Resolvers.Deployments do
  use Console.GraphQl.Resolvers.Base, model: Console.Schema.Cluster
  import Console.Deployments.Policies, only: [allow: 3]
  import Console.GraphQl.Resolvers.Deployments.Base
  alias Console.Deployments.{Clusters, Services, Settings, Global, AddOns}
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
  }

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
  def query(_, _), do: Cluster

  delegates Console.GraphQl.Resolvers.Deployments.Git
  delegates Console.GraphQl.Resolvers.Deployments.Cluster
  delegates Console.GraphQl.Resolvers.Deployments.Service
  delegates Console.GraphQl.Resolvers.Deployments.Pipeline
  delegates Console.GraphQl.Resolvers.Deployments.Backup
  delegates Console.GraphQl.Resolvers.Deployments.Notification

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
    Tag.cluster()
    |> tag_search_filters(args)
    |> Tag.ordered([asc: :name, asc: :value])
    |> paginate(args)
  end

  defp tag_search_filters(query, args) do
    Enum.reduce(args, query, fn
      {:tag, t}, q -> Tag.for_name(q, t)
      {:q, s}, q -> Tag.search(q, s)
      _, q -> q
    end)
  end

  defp tag_args(%{tag: _}), do: {[asc: :value], :value}
  defp tag_args(_), do: {[asc: :name], :name}

  def resolve_global(%{id: id}, %{context: %{current_user: user}}) do
    Global.get!(id)
    |> allow(user, :read)
  end

  def settings(_, _), do: {:ok, Settings.fetch_consistent()}

  def enable(_, %{context: %{current_user: user}}), do: Settings.enable(user)

  def self_manage(%{values: values}, %{context: %{current_user: user}}),
    do: Services.self_manage(values, user)

  def update_settings(%{attributes: attrs}, %{context: %{current_user: user}}),
    do: Settings.update(attrs, user)

  def create_global_service(%{cluster: _, name: _, attributes: attrs} = args, %{context: %{current_user: user}}) do
    svc = fetch_service(args)
    Global.create(attrs, svc.id, user)
  end
  def create_global_service(%{service_id: sid, attributes: attrs}, %{context: %{current_user: user}}),
    do: Global.create(attrs, sid, user)

  def update_global_service(%{id: id, attributes: attrs}, %{context: %{current_user: user}}),
    do: Global.update(attrs, id, user)

  def delete_global_service(%{id: id}, %{context: %{current_user: user}}),
    do: Global.delete(id, user)

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
end
