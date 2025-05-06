defmodule Console.GraphQl.Resolvers.Deployments.Cluster do
  use Console.GraphQl.Resolvers.Deployments.Base
  alias Console.Deployments.{Clusters, Settings}
  alias Console.Cost.Pr
  alias Console.AI.Stream
  alias Console.Schema.{
    User,
    Cluster,
    ClusterProvider,
    ClusterRevision,
    PinnedCustomResource,
    ClusterUsage,
    ClusterUsageHistory,
    ClusterNamespaceUsage,
    ClusterScalingRecommendation,
    ClusterAuditLog,
    ClusterRegistration,
    ClusterISOImage,
    DeploymentSettings
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

  def resolve_cluster_registration(%{machine_id: id}, %{context: %{current_user: user}}) do
    Clusters.get_registration_by_machine_id!(id)
    |> allow(user, :read)
  end
  def resolve_cluster_registration(%{id: id}, %{context: %{current_user: user}}) do
    Clusters.get_cluster_registration!(id)
    |> allow(user, :read)
  end

  def resolve_cluster_iso_image(%{image: id}, %{context: %{current_user: user}}) do
    Clusters.get_iso_image_by_image!(id)
    |> allow(user, :write)
  end
  def resolve_cluster_iso_image(%{id: id}, %{context: %{current_user: user}}) do
    Clusters.get_cluster_iso_image!(id)
    |> allow(user, :write)
  end

  defp get_provider(%{id: id}) when is_binary(id), do: Clusters.get_provider!(id)
  defp get_provider(%{name: name}) when is_binary(name), do: Clusters.get_provider_by_name(name)
  defp get_provider(%{cloud: cloud}) when is_binary(cloud), do: Clusters.get_provider_by_cloud(cloud)

  def my_cluster(_, %{context: %{cluster: cluster}}), do: {:ok, cluster}

  def token_exchange(%{token: "plrl:" <> token}, _) do
    with [id, token] <- String.split(token, ":"),
         {:ok, _} <- Uniq.UUID.parse(id),
         %Cluster{} <- Clusters.get_cluster(id),
         {:token, %User{} = user} <- {:token, Console.authed_user(token)} do
      {:ok, user}
    else
      nil -> {:error, "cluster does not exist"}
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

  def resolve_cluster_usage(%{id: id}, %{context: %{current_user: user}}) do
    %{cluster: cluster} = usage = Clusters.get_cluster_usage!(id)
    with {:ok, _} <- allow(cluster, user, :read),
      do: {:ok, usage}
  end

  def list_cluster_usage(args, %{context: %{current_user: user}}) do
    Cluster.for_user(user)
    |> maybe_search(Cluster, args)
    |> cluster_filters(args)
    |> ClusterUsage.for_clusters()
    |> ClusterUsage.ordered()
    |> ClusterUsage.preloaded()
    |> paginate(args)
  end

  def list_cluster_usage_history(%ClusterUsage{cluster_id: cluster_id}, args, _) do
    ClusterUsageHistory.for_cluster(cluster_id)
    |> ClusterUsageHistory.ordered()
    |> paginate(args)
  end

  def list_namespace_usage(%ClusterUsage{cluster_id: cluster_id}, args, _) do
    ClusterNamespaceUsage.for_cluster(cluster_id)
    |> maybe_search(ClusterNamespaceUsage, args)
    |> ClusterNamespaceUsage.ordered()
    |> ClusterNamespaceUsage.preloaded()
    |> paginate(args)
  end

  def list_scaling_recommendations(%ClusterUsage{cluster_id: cluster_id}, args, _) do
    ClusterScalingRecommendation.for_cluster(cluster_id)
    |> recommendation_filters(args)
    |> maybe_search(ClusterScalingRecommendation, args)
    |> ClusterScalingRecommendation.ordered()
    |> ClusterScalingRecommendation.preloaded()
    |> paginate(args)
  end

  def list_cluster_audits(%Cluster{id: id}, args, _) do
    ClusterAuditLog.for_cluster(id)
    |> ClusterAuditLog.ordered()
    |> paginate(args)
  end

  def agent_helm_values_for_cluster(_, _, _) do
    case Settings.cached() do
      %DeploymentSettings{agent_helm_values: vals} when is_binary(vals) ->
        {:ok, vals}
      _ -> {:ok, nil}
    end
  end

  def list_cluster_registrations(args, _) do
    ClusterRegistration.ordered()
    |> paginate(args)
  end

  def list_cluster_iso_images(args, %{context: %{current_user: user}}) do
    ClusterISOImage.ordered()
    |> ClusterISOImage.for_user(user)
    |> paginate(args)
  end

  def runtime_services(cluster, _, _), do: {:ok, Clusters.runtime_services(cluster)}

  def cloud_addons(cluster, _, _), do: {:ok, Clusters.cloud_addons(cluster)}

  def deploy_token(%{deploy_token: token} = cluster, _, %{context: %{current_user: user}}) do
    case allow(cluster, user, :token) do
      {:ok, _} -> {:ok, token}
      error -> error
    end
  end

  def network_graph(parent, args, _),
    do: Console.Mesh.Provider.graph(parent, Map.to_list(args))

  def metrics_summary(cluster, _args, _) do
    case Clusters.cached_cluster_metrics(cluster) do
      {:ok, %Kube.MetricsAggregate{status: %Kube.MetricsAggregate.Status{} = metrics}} ->
        {:ok, %{
          cpu_available: cores(metrics.cpu_available_millicores),
          cpu_total: cores(metrics.cpu_total_millicores),
          cpu_used: metrics.cpu_used_percentage,
          memory_available: milli(metrics.memory_available_bytes),
          memory_total: milli(metrics.memory_total_bytes),
          memory_used: metrics.memory_used_percentage,
          nodes: metrics.nodes
        }}
      _ -> {:ok, nil}
    end
  end

  defp cores(val) when is_integer(val), do: val / 1000
  defp cores(_), do: nil

  defp milli(val) when is_integer(val), do: val / (1000 * 1000)
  defp milli(_), do: nil

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

  def cost_ingest(%{costs: data}, %{context: %{cluster: cluster}}),
    do: Console.Cost.Ingester.ingest(data, cluster)

  def create_cluster(%{attributes: attrs}, %{context: %{current_user: user}}),
    do: Clusters.create_cluster(attrs, user)

  def update_cluster(%{id: id, attributes: attrs}, %{context: %{current_user: user}}),
    do: Clusters.update_cluster(attrs, id, user)

  def delete_cluster(%{id: id}, %{context: %{current_user: user}}),
    do: Clusters.delete_cluster(id, user)

  def detach_cluster(%{id: id}, %{context: %{current_user: user}}),
    do: Clusters.detach_cluster(id, user)

  def upsert_virtual_cluster(%{attributes: attrs, parent_id: id}, %{context: %{current_user: user}}),
    do: Clusters.upsert_virtual_cluster(attrs, id, user)

  def delete_virtual_cluster(%{id: id}, %{context: %{current_user: user}}),
    do: Clusters.delete_virtual_cluster(id, user)

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

  def create_runtime_services(args, %{context: %{cluster: cluster}}),
    do: Clusters.create_runtime_services(args, args[:service_id], cluster)

  def create_agent_migration(%{attributes: attrs}, %{context: %{current_user: user}}),
    do: Clusters.create_agent_migration(attrs, user)

  def create_pinned_custom_resource(%{attributes: attrs}, %{context: %{current_user: user}}),
    do: Clusters.create_pinned_custom_resource(attrs, user)

  def delete_pinned_custom_resource(%{id: id}, %{context: %{current_user: user}}),
    do: Clusters.delete_pinned_custom_resource(id, user)

  def save_upgrade_insights(attrs, %{context: %{cluster: cluster}}),
    do: Clusters.save_upgrade_insights(attrs, cluster)

  def create_cluster_registration(%{attributes: attrs}, %{context: %{current_user: user}}),
    do: Clusters.create_cluster_registration(attrs, user)

  def update_cluster_registration(%{id: id, attributes: attrs}, %{context: %{current_user: user}}),
    do: Clusters.update_cluster_registration(attrs, id, user)

  def delete_cluster_registration(%{id: id}, %{context: %{current_user: user}}),
    do: Clusters.delete_cluster_registration(id, user)

  def create_cluster_iso_image(%{attributes: attrs}, %{context: %{current_user: user}}),
    do: Clusters.create_cluster_iso_image(attrs, user)

  def update_cluster_iso_image(%{id: id, attributes: attrs}, %{context: %{current_user: user}}),
    do: Clusters.update_cluster_iso_image(attrs, id, user)

  def delete_cluster_iso_image(%{id: id}, %{context: %{current_user: user}}),
    do: Clusters.delete_cluster_iso_image(id, user)

  def ping(%{attributes: attrs}, %{context: %{cluster: cluster}}),
    do: Clusters.ping(attrs, cluster)

  def scaling_pr(%{id: id}, %{context: %{current_user: user}}),
    do: Pr.create(id, user)

  def scaling_pr_suggestion(%{id: id}, %{context: %{current_user: user}}) do
    Stream.topic(:cost, id, user)
    |> Stream.enable()

    Pr.suggestion(id, user)
  end

  def add_cluster_audit(_, %{context: %{current_user: %User{email: "console@plural.sh"}}}), do: {:ok, false}
  def add_cluster_audit(%{audit: audit}, %{context: %{current_user: user}}) do
    Map.put(audit, :actor_id, user.id)
    |> Console.Buffers.ClusterAudit.audit()

    {:ok, true}
  end

  defp cluster_filters(query, args) do
    Enum.reduce(args, query, fn
      {:tag, %{name: n, value: v}}, q -> Cluster.with_tag(q, n, v)
      {:tag_query, %{} = tq}, q -> Cluster.with_tag_query(q, tq)
      {:healthy, h}, q -> Cluster.health(q, h)
      {:backups, e}, q -> Cluster.with_backups(q, !!e)
      {:project_id, id}, q when is_binary(id) -> Cluster.for_project(q, id)
      {:parent_id, id}, q when is_binary(id) -> Cluster.for_parent(q, id)
      {:upgradeable, true}, q -> Cluster.upgradeable(q)
      {:upgradeable, false}, q -> Cluster.not_upgradeable(q)
      _, q -> q
    end)
  end

  defp recommendation_filters(query, args) do
    Enum.reduce(args, query, fn
      {:type, t}, q -> ClusterScalingRecommendation.for_type(q, t)
      _, q -> q
    end)
  end
end
