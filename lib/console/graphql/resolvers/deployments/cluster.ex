defmodule Console.GraphQl.Resolvers.Deployments.Cluster do
  use Console.GraphQl.Resolvers.Deployments.Base
  alias Console.Deployments.Clusters
  alias Console.Schema.{
    User,
    Cluster,
    ClusterProvider,
    ClusterRevision,
    PinnedCustomResource
  }

  def resolve_cluster(_, %{context: %{cluster: cluster}}), do: {:ok, cluster}
  def resolve_cluster(%{handle: handle}, %{context: %{current_user: user}}) when is_binary(handle) do
    case Clusters.get_cluster_by_handle(handle) do
      %Cluster{} = cluster -> cluster
      _ -> Clusters.find!(handle)
    end
    |> allow(user, :view)
  end
  def resolve_cluster(%{id: id}, %{context: %{current_user: user}}) when is_binary(id) do
    Clusters.get_cluster!(id)
    |> allow(user, :view)
  end
  def resolve_cluster(_, _), do: {:error, "must provide either handle or id"}

  def resolve_runtime_service(%{id: id}, %{context: %{current_user: user}}) do
    Clusters.get_runtime_service(id)
    |> allow(user, :read)
  end

  def resolve_cluster_status(cluster, _, _) do
    case Clusters.cluster_crd(cluster) do
      {:ok, %{status: status}} -> {:ok, status}
      _ -> {:ok, nil}
    end
  end

  def resolve_provider(args, %{context: %{current_user: user}}) do
    get_provider(args)
    |> allow(user, :read)
  end

  defp get_provider(%{id: id}) when is_binary(id), do: Clusters.get_provider!(id)
  defp get_provider(%{name: name}) when is_binary(name), do: Clusters.get_provider_by_name(name)
  defp get_provider(%{cloud: cloud}) when is_binary(cloud), do: Clusters.get_provider_by_cloud(cloud)

  def my_cluster(_, %{context: %{cluster: cluster}}), do: {:ok, cluster}

  def token_exchange(%{token: "plrl:" <> token}, _) do
    with [id, token] <- String.split(token, ":"),
         {:ok, _} <- Uniq.UUID.parse(id),
         %Cluster{} = cluster <- Clusters.get_cluster(id),
         {:token, %User{} = user} <- {:token, Console.authed_user(token)},
         {:ok, _} <- allow(cluster, user, :read) do
      {:ok, user}
    else
      nil -> {:error, "does not exist"}
      {:token, _} -> {:error, "unauthenticated"}
      _ -> {:error, "invalid token"}
    end
  end
  def token_exchange(_, _), do: {:error, "invalid token"}

  def list_clusters(args, %{context: %{current_user: user}}) do
    Cluster.ordered()
    |> Cluster.for_user(user)
    |> Cluster.preloaded()
    |> maybe_search(Cluster, args)
    |> cluster_filters(args)
    |> paginate(args)
  end

  def list_cluster_revisions(%{id: id}, args, _) do
    ClusterRevision.for_cluster(id)
    |> ClusterRevision.ordered()
    |> paginate(args)
  end

  def list_providers(args, %{context: %{current_user: user}}) do
    ClusterProvider.ordered()
    |> ClusterProvider.for_user(user)
    |> paginate(args)
  end

  def list_nodes(cluster, _, _), do: Clusters.nodes(cluster)

  def list_node_metrics(cluster, _, _), do: Clusters.node_metrics(cluster)

  def list_pinned_custom_resources(cluster, _, _) do
    PinnedCustomResource.for_cluster(cluster.id)
    |> PinnedCustomResource.ordered()
    |> Console.Repo.all()
    |> ok()
  end

  def runtime_services(cluster, _, _), do: {:ok, Clusters.runtime_services(cluster)}

  def deploy_token(%{deploy_token: token} = cluster, _, %{context: %{current_user: user}}) do
    case allow(cluster, user, :write) do
      {:ok, _} -> {:ok, token}
      error -> error
    end
  end

  def cluster_statuses(args, %{context: %{current_user: user}}) do
    Cluster.for_user(user)
    |> cluster_filters(args)
    |> maybe_search(Cluster, args)
    |> Cluster.statistics()
    |> Console.Repo.all()
    |> ok()
  end

  def upgrade_statistics(args, %{context: %{current_user: user}}) do
    Cluster.for_user(user)
    |> cluster_filters(args)
    |> maybe_search(Cluster, args)
    |> Cluster.upgrade_statistics()
    |> Console.Repo.one()
    |> ok()
  end

  def create_cluster(%{attributes: attrs}, %{context: %{current_user: user}}),
    do: Clusters.create_cluster(attrs, user)

  def update_cluster(%{id: id, attributes: attrs}, %{context: %{current_user: user}}),
    do: Clusters.update_cluster(attrs, id, user)

  def delete_cluster(%{id: id}, %{context: %{current_user: user}}),
    do: Clusters.delete_cluster(id, user)

  def detach_cluster(%{id: id}, %{context: %{current_user: user}}),
    do: Clusters.detach_cluster(id, user)

  def create_provider(%{attributes: attrs}, %{context: %{current_user: user}}),
    do: Clusters.create_provider(attrs, user)

  def update_provider(%{id: id, attributes: attrs}, %{context: %{current_user: user}}),
    do: Clusters.update_provider(attrs, id, user)

  def delete_provider(%{id: id}, %{context: %{current_user: user}}),
    do: Clusters.delete_provider(id, user)

  def create_provider_credential(%{attributes: attrs, name: name}, %{context: %{current_user: user}}),
    do: Clusters.create_provider_credential(attrs, name, user)

  def delete_provider_credential(%{id: id}, %{context: %{current_user: user}}),
    do: Clusters.delete_provider_credential(id, user)

  def create_runtime_services(%{services: svcs} = args, %{context: %{cluster: cluster}}),
    do: Clusters.create_runtime_services(svcs, args[:service_id], cluster)

  def create_agent_migration(%{attributes: attrs}, %{context: %{current_user: user}}),
    do: Clusters.create_agent_migration(attrs, user)

  def create_pinned_custom_resource(%{attributes: attrs}, %{context: %{current_user: user}}),
    do: Clusters.create_pinned_custom_resource(attrs, user)

  def delete_pinned_custom_resource(%{id: id}, %{context: %{current_user: user}}),
    do: Clusters.delete_pinned_custom_resource(id, user)

  def ping(%{attributes: attrs}, %{context: %{cluster: cluster}}),
    do: Clusters.ping(attrs, cluster)

  defp cluster_filters(query, args) do
    Enum.reduce(args, query, fn
      {:tag, %{name: n, value: v}}, q -> Cluster.with_tag(q, n, v)
      {:tag_query, tq}, q -> Cluster.with_tag_query(q, tq)
      {:healthy, h}, q -> Cluster.health(q, h)
      {:backups, e}, q -> Cluster.with_backups(q, !!e)
      {:project_id, id}, q -> Cluster.for_project(q, id)
      _, q -> q
    end)
  end
end
