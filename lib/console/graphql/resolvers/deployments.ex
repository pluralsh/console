defmodule Console.GraphQl.Resolvers.Deployments do
  use Console.GraphQl.Resolvers.Base, model: Console.Schema.Cluster
  import Console.Deployments.Policies, only: [allow: 3]
  alias Console.Deployments.{Clusters, Services, Git, Settings, Global}
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
    User,
    ServiceError,
    ClusterRevision,
    ProviderCredential
  }

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
  def query(_, _), do: Cluster

  def list_clusters(args, %{context: %{current_user: user}}) do
    Cluster.ordered()
    |> Cluster.for_user(user)
    |> Cluster.preloaded()
    |> paginate(args)
  end

  def list_providers(args, %{context: %{current_user: user}}) do
    ClusterProvider.ordered()
    |> ClusterProvider.for_user(user)
    |> paginate(args)
  end

  def list_services(args, %{context: %{current_user: user}}) do
    Service.for_user(user)
    |> service_filters(args)
    |> Service.ordered()
    |> paginate(args)
  end

  def list_nodes(cluster, _, _), do: Clusters.nodes(cluster)

  def list_node_metrics(cluster, _, _), do: Clusters.node_metrics(cluster)

  def service_statuses(args, %{context: %{current_user: user}}) do
    Service.for_user(user)
    |> service_filters(args)
    |> Service.statuses()
    |> Console.Repo.all()
    |> ok()
  end

  defp service_filters(query, args) do
    Enum.reduce(args, query, fn
      {:cluster_id, id}, q -> Service.for_cluster(q, id)
      {:cluster, handle}, q -> Service.for_cluster_handle(q, handle)
      _, q -> q
    end)
  end

  def cluster_services(_, %{context: %{cluster: %{id: id}}}) do
    Service.for_cluster(id)
    |> Service.ordered()
    |> all()
  end

  def list_revisions(%{id: id}, args, _) do
    Revision.for_service(id)
    |> Revision.ordered()
    |> paginate(args)
  end

  def list_cluster_revisions(%{id: id}, args, _) do
    ClusterRevision.for_cluster(id)
    |> ClusterRevision.ordered()
    |> paginate(args)
  end

  def list_git_repositories(args, _) do
    GitRepository.ordered()
    |> paginate(args)
  end

  def resolve_cluster(_, %{context: %{cluster: cluster}}), do: {:ok, cluster}
  def resolve_cluster(%{handle: handle}, %{context: %{current_user: user}}) do
    Clusters.find!(handle)
    |> allow(user, :read)
  end
  def resolve_cluster(%{id: id}, %{context: %{current_user: user}}) do
    Clusters.get_cluster(id)
    |> allow(user, :read)
  end

  def resolve_cluster_status(cluster, _, _) do
    case Clusters.cluster_crd(cluster) do
      {:ok, %{status: status}} -> {:ok, status}
      _ -> {:ok, nil}
    end
  end

  def resolve_git(%{id: id}, %{context: %{current_user: user}}) do
    Git.get_repository(id)
    |> allow(user, :read)
  end

  def resolve_service(%{cluster: _, name: _} = args, ctx) do
    fetch_service(args)
    |> allow(actor(ctx), :name)
  end
  def resolve_service(%{id: id}, ctx) do
    Services.get_service!(id)
    |> allow(actor(ctx), :read)
  end

  defp actor(%{context: %{current_user: %User{} = user}}), do: user
  defp actor(%{context: %{cluster: %Cluster{} = cluster}}), do: cluster
  defp actor(_), do: nil

  def resolve_provider(%{id: id}, %{context: %{current_user: user}}) do
    Clusters.get_provider!(id)
    |> allow(user, :read)
  end

  def docs(svc, _, _), do: Services.docs(svc)

  def deploy_token(%{deploy_token: token} = cluster, _, %{context: %{current_user: user}}) do
    case allow(cluster, user, :write) do
      {:ok, _} -> {:ok, token}
      error -> error
    end
  end

  def settings(_, _), do: {:ok, Settings.fetch()}

  def service_configuration(service, _, ctx) do
    with {:ok, _} <- allow(service, actor(ctx), :secrets),
         {:ok, secrets} <- Services.configuration(service) do
      {:ok, Enum.map(secrets, fn {k, v} -> %{name: k, value: v} end)}
    end
  end

  def enable(_, %{context: %{current_user: user}}), do: Settings.enable(user)

  def create_cluster(%{attributes: attrs}, %{context: %{current_user: user}}),
    do: Clusters.create_cluster(attrs, user)

  def create_provider(%{attributes: attrs}, %{context: %{current_user: user}}),
    do: Clusters.create_provider(attrs, user)

  def update_cluster(%{id: id, attributes: attrs}, %{context: %{current_user: user}}),
    do: Clusters.update_cluster(attrs, id, user)

  def delete_cluster(%{id: id}, %{context: %{current_user: user}}),
    do: Clusters.delete_cluster(id, user)

  def update_provider(%{id: id, attributes: attrs}, %{context: %{current_user: user}}),
    do: Clusters.update_provider(attrs, id, user)

  def create_provider_credential(%{attributes: attrs, name: name}, %{context: %{current_user: user}}),
    do: Clusters.create_provider_credential(attrs, name, user)

  def delete_provider_credential(%{id: id}, %{context: %{current_user: user}}),
    do: Clusters.delete_provider_credential(id, user)

  def create_service(%{attributes: attrs, cluster: cluster}, %{context: %{current_user: user}}) when is_binary(cluster) do
    cluster = Clusters.find!(cluster)
    Services.create_service(attrs, cluster.id, user)
  end
  def create_service(%{attributes: attrs, cluster_id: id}, %{context: %{current_user: user}}),
    do: Services.create_service(attrs, id, user)

  def update_service(%{attributes: attrs, cluster: _, name: _} = args, %{context: %{current_user: user}}) do
    svc = fetch_service(args)
    Services.update_service(attrs, svc.id, user)
  end
  def update_service(%{attributes: attrs, id: id}, %{context: %{current_user: user}}),
    do: Services.update_service(attrs, id, user)

  def delete_service(%{cluster: _, name: _} = args, %{context: %{current_user: user}}) do
    svc = fetch_service(args)
    Services.delete_service(svc.id, user)
  end
  def delete_service(%{id: id}, %{context: %{current_user: user}}),
    do: Services.delete_service(id, user)

  def clone_service(%{cluster: _, name: _, cluster_id: cid, attributes: attrs} = args, %{context: %{current_user: user}}) do
    svc = fetch_service(args)
    Services.clone_service(attrs, svc.id, cid, user)
  end
  def clone_service(%{service_id: sid, cluster_id: cid, attributes: attrs}, %{context: %{current_user: user}}),
    do: Services.clone_service(attrs, sid, cid, user)

  def rollback(%{cluster: _, name: _, revision_id: rev} = args, %{context: %{current_user: user}}) do
    svc = fetch_service(args)
    Services.rollback(rev, svc.id, user)
  end
  def rollback(%{id: id, revision_id: rev}, %{context: %{current_user: user}}),
    do: Services.rollback(rev, id, user)

  def update_service_components(%{id: id} = args, %{context: %{cluster: cluster}}),
    do: Services.update_components(Map.take(args, [:errors, :components]), id, cluster)

  def create_git_repository(%{attributes: attrs}, %{context: %{current_user: user}}),
    do: Git.create_repository(attrs, user)

  def update_git_repository(%{id: id, attributes: attrs}, %{context: %{current_user: user}}),
    do: Git.update_repository(attrs, id, user)

  def delete_git_repository(%{id: id}, %{context: %{current_user: user}}),
    do: Git.delete_repository(id, user)

  def update_settings(%{attributes: attrs}, %{context: %{current_user: user}}),
    do: Settings.update(attrs, user)

  def create_global_service(%{cluster: _, name: _, attributes: attrs} = args, %{context: %{current_user: user}}) do
    svc = fetch_service(args)
    Global.create(attrs, svc.id, user)
  end
  def create_global_service(%{service_id: sid, attributes: attrs}, %{context: %{current_user: user}}),
    do: Global.create(attrs, sid, user)

  def delete_global_service(%{id: id}, %{context: %{current_user: user}}),
    do: Global.delete(id, user)

  def merge_service(%{id: id, configuration: config}, %{context: %{current_user: user}}),
    do: Services.merge_service(config, id, user)

  def tarball(svc, _, _), do: {:ok, Services.tarball(svc)}

  def ping(%{attributes: attrs}, %{context: %{cluster: cluster}}),
    do: Clusters.ping(attrs, cluster)

  def editable(resource, _, %{context: %{current_user: user}}) do
    case allow(resource, user, :write) do
      {:ok, _} -> {:ok, true}
      _ -> {:ok, false}
    end
  end
  def editable(_, _, _), do: {:ok, false}

  def rbac(%{rbac: rbac} = args, %{context: %{current_user: user}}) do
    {fun, id} = rbac_args(args)
    case fun.(rbac, id, user) do
      {:ok, _} -> {:ok, true}
      err -> err
    end
  end

  defp rbac_args(%{provider_id: prov_id}), do: {&Clusters.provider_rbac/3, prov_id}
  defp rbac_args(%{cluster_id: prov_id}), do: {&Clusters.rbac/3, prov_id}
  defp rbac_args(%{service_id: prov_id}), do: {&Services.rbac/3, prov_id}

  defp fetch_service(%{cluster: cluster, name: name}) do
    cluster = Clusters.find!(cluster)
    Services.get_service_by_name!(cluster.id, name)
  end
end
