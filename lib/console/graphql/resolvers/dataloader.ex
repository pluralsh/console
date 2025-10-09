
defmodule Console.GraphQl.Resolvers.HelmRepositoryLoader do
  alias Console.Deployments.Git

  def data(_) do
    Dataloader.KV.new(&query/2, max_concurrency: 1)
  end

  def query(_, services) do
    with_keys = Enum.map(services, & {&1, key(&1)})
    case Enum.any?(with_keys, fn {_, key} -> not is_nil(key) end) do
      true ->
        repos = fetch_repos()
        Map.new(with_keys, fn {svc, key} -> {svc, repos[key]} end)
      false -> Map.new(services, & {&1, nil})
    end
  end

  def fetch_repos() do
    case Git.cached_helm_repositories() do
      {:ok, repos} ->
        Map.new(repos, & {{&1.metadata.namespace, &1.metadata.name}, &1})
      _ -> %{}
    end
  end

  defp key(%{helm: %{repository: %{namespace: ns, name: n}}}), do: {ns, n}
  defp key(_), do: nil
end

defmodule Console.GraphQl.Resolvers.PipelineGateLoader do
  alias Console.Schema.Pipeline

  def data(_) do
    Dataloader.KV.new(&query/2, max_concurrency: 1)
  end

  def query(_, ids) do
    MapSet.to_list(ids)
    |> Pipeline.for_ids()
    |> Pipeline.gate_statuses()
    |> Console.Repo.all()
    |> Map.new(& {&1.id, &1})
  end
end

defmodule Console.GraphQl.Resolvers.UserLoader do
  alias Console.Schema.User

  def data(_) do
    Dataloader.KV.new(&query/2, max_concurrency: 1)
  end

  def query(_, emails) do
    users = fetch_users(emails)
    Map.new(emails, & {&1, users[&1]})
  end

  def fetch_users(emails) do
    MapSet.to_list(emails)
    |> User.with_emails()
    |> Console.Repo.all()
    |> Map.new(& {&1.email, &1})
  end
end

defmodule Console.GraphQl.Resolvers.ClusterLoader do
  alias Console.Schema.Cluster

  def data(_) do
    Dataloader.KV.new(&query/2, max_concurrency: 1)
  end

  def query(_, ids) do
    clusters = fetch_clusters(ids)
    Map.new(ids, & {&1, clusters[&1]})
  end

  def fetch_clusters(ids) do
    MapSet.to_list(ids)
    |> Cluster.for_ids()
    |> Console.Repo.all()
    |> Map.new(& {&1.id, &1})
  end
end
