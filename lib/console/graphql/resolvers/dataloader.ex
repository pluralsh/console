
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

defmodule Console.GraphQl.Resolvers.PolicyCountLoader do
  alias Console.Schema.{BindingPolicy, StackPolicy, WorkbenchPolicy, PolicyEvaluation}

  def data(_) do
    Dataloader.KV.new(&query/2, max_concurrency: 1)
  end

  def query(:match, ids), do: counts(&BindingPolicy.match_counts_for_bind_policies/1, ids)
  def query(:evaluation, ids), do: counts(&PolicyEvaluation.counts_for_policies/1, ids)
  def query(:workbench_attachment, ids), do: counts(&WorkbenchPolicy.counts_for_policies/1, ids)
  def query(:stack_attachment, ids), do: counts(&StackPolicy.counts_for_policies/1, ids)

  defp counts(fun, ids) do
    counts = fun.(MapSet.to_list(ids))
    Map.new(ids, & {&1, Map.get(counts, &1, 0)})
  end
end

defmodule Console.GraphQl.Resolvers.GroupMemberCountLoader do
  alias Console.Schema.GroupMember

  def data(_) do
    Dataloader.KV.new(&query/2, max_concurrency: 1)
  end

  def query(:group, ids) do
    counts =
      MapSet.to_list(ids)
      |> GroupMember.counts_by_group()
      |> Console.Repo.all()
      |> Map.new()

    Map.new(ids, & {&1, Map.get(counts, &1, 0)})
  end
end

defmodule Console.GraphQl.Resolvers.FlowSummaryLoader do
  import Absinthe.Resolution.Helpers, only: [on_load: 2]
  alias Console.Repo
  alias Console.Schema.{Service, ServiceComponent, Alert, Pipeline}

  def data(_) do
    Dataloader.KV.new(&query/2, max_concurrency: 1)
  end

  def query(:summary, ids) do
    ids = MapSet.to_list(ids)
    summaries = summaries(ids)
    Map.new(ids, & {&1, Map.get(summaries, &1, empty_summary())})
  end

  def resolve(key) do
    fn %{id: id}, _, %{context: %{loader: loader}} ->
      loader
      |> Dataloader.load(__MODULE__, :summary, id)
      |> on_load(fn loader ->
        {:ok, Map.get(Dataloader.get(loader, __MODULE__, :summary, id), key)}
      end)
    end
  end

  defp summaries(ids) do
    base = Map.new(ids, &{&1, empty_summary()})

    base
    |> put_status_groups(Repo.all(Service.for_flow_ids(ids) |> Service.count_by_flow_status()), :service_statuses, :service_count)
    |> put_status_groups(Repo.all(ServiceComponent.count_by_flow_state(ids)), :component_statuses, :component_count)
    |> put_counts(Repo.all(Alert.count_by_flow(ids)), :alert_count)
    |> put_counts(Repo.all(Pipeline.for_flow_ids(ids) |> Pipeline.count_by_flow()), :pipeline_count)
    |> put_counts(Repo.all(Pipeline.for_flow_ids(ids) |> Pipeline.pending_gate_count_by_flow()), :pending_pipeline_count)
  end

  defp empty_summary do
    %{
      service_count: 0,
      component_count: 0,
      alert_count: 0,
      pipeline_count: 0,
      pending_pipeline_count: 0,
      service_statuses: [],
      component_statuses: []
    }
  end

  defp put_status_groups(map, rows, list_key, count_key) do
    Enum.reduce(rows, map, fn {id, entry}, acc ->
      Map.update!(acc, id, fn summary ->
        summary
        |> Map.update!(list_key, &[entry | &1])
        |> Map.update!(count_key, &(&1 + entry.count))
      end)
    end)
  end

  defp put_counts(map, rows, key) do
    Enum.reduce(rows, map, fn {id, count}, acc ->
      Map.update!(acc, id, &Map.put(&1, key, count))
    end)
  end
end
