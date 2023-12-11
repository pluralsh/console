defimpl Console.PubSub.Recurse, for: Console.PubSub.GitRepositoryCreated do
  alias Console.Deployments.Git.Discovery
  def process(%{item: repo}), do: Discovery.start(repo)
end

defimpl Console.PubSub.Recurse, for: Console.PubSub.ServiceComponentsUpdated do
  alias Console.Schema.{Service, ServiceComponent}
  alias Console.Deployments.Services

  def process(%{item: %Service{namespace: ns, deleted_at: del} = svc}) when not is_nil(del) do
    case Console.Repo.preload(svc, [:components]) do
      %Service{components: []} -> Services.hard_delete(svc)
      %Service{components: [%ServiceComponent{kind: "Namespace", name: ^ns}]} ->
        Services.hard_delete(svc)
      _ -> :ok
    end
  end
  def process(_), do: :ok
end

defimpl Console.PubSub.Recurse, for: Console.PubSub.ServiceCreated do
  alias Console.Schema.Service
  alias Console.Deployments.Helm.Charts

  def process(%{item: %Service{} = svc}), do: Charts.get(svc)
end

defimpl Console.PubSub.Recurse, for: Console.PubSub.ServiceUpdated do
  alias Console.Deployments.Global
  alias Console.Deployments.Helm.Charts
  alias Console.Schema.{User, Service, GlobalService}

  def process(%{item: %Service{} = item, actor: %User{}}) do
    Charts.get(item)
    case Console.Repo.preload(item, [:global_service]) do
      %Service{global_service: %GlobalService{} = global} ->
        {:global, Global.sync_clusters(global)}
      _ -> :ok
    end
  end
  def process(_), do: :ok
end

defimpl Console.PubSub.Recurse, for: Console.PubSub.ClusterCreated do
  alias Console.Repo
  alias Console.Deployments.Global
  alias Console.Schema.GlobalService

  def process(%{item: cluster}) do
    cluster = Repo.preload(cluster, [:tags])
    GlobalService.stream()
    |> Repo.stream(method: :keyset)
    |> Stream.filter(&Global.match?(&1, cluster))
    |> Stream.each(&Global.add_to_cluster(&1, cluster))
    |> Stream.run()
  end
end

defimpl Console.PubSub.Recurse, for: Console.PubSub.GlobalServiceCreated do
  alias Console.Deployments.Global

  def process(%{item: global}), do: Global.sync_clusters(global)
end

defimpl Console.PubSub.Recurse, for: Console.PubSub.ServiceHardDeleted do
  alias Console.Schema.{Service, Cluster}
  alias Console.Deployments.Clusters

  def process(%{item: %Service{cluster_id: id}}) do
    with {:cluster, %Cluster{deleted_at: del} = cluster} when not is_nil(del) <- {:cluster, Clusters.get_cluster(id)},
         {:draining, false} <- {:draining, Clusters.draining?(cluster)},
      do: Clusters.drained(cluster)
  end
end

defimpl Console.PubSub.Recurse, for: Console.PubSub.AgentMigrationCreated do
  alias Console.Deployments.Clusters

  def process(%{item: migration}), do: Clusters.apply_migration(migration)
end
