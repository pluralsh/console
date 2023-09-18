defimpl Console.PubSub.Recurse, for: Console.PubSub.GitRepositoryCreated do
  alias Console.Deployments.Git.Discovery
  def process(%{item: repo}), do: Discovery.start(repo)
end

defimpl Console.PubSub.Recurse, for: Console.PubSub.ServiceComponentsUpdated do
  alias Console.Schema.Service
  alias Console.Deployments.Services

  def process(%{item: %Service{deleted_at: del} = svc}) when not is_nil(del) do
    case Console.Repo.preload(svc, [:components]) do
      %Service{components: []} -> Services.hard_delete(svc)
      _ -> :ok
    end
  end
  def process(_), do: :ok
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
