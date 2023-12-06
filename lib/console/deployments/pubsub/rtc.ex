defmodule Console.Deployments.Rtc.Utils do
  alias Console.Repo
  alias Console.Schema.{Pipeline, Service, Cluster, DeploymentSettings}
  alias Console.Deployments.Settings

  def audience(%Pipeline{} = pipe) do
    %{read_bindings: bindings} = Repo.preload(pipe, [:read_bindings])
    Settings.fetch()
    |> collect(bindings)
  end

  def audience(%Service{} = service) do
    %{read_bindings: bindings, cluster: cluster} = Repo.preload(service, [:read_bindings, cluster: :read_bindings])
    audience(cluster)
    |> collect(bindings)
  end

  def audience(%Cluster{} = cluster) do
    %{read_bindings: bindings} = Repo.preload(cluster, [:read_bindings])
    Settings.fetch()
    |> collect(bindings)
  end

  defp collect(%DeploymentSettings{read_bindings: [_ | _] = globals}, bindings) when is_list(bindings),
    do: do_collect(bindings ++ globals)
  defp collect({_, _} = acc, bindings) when is_list(bindings), do: do_collect(bindings, acc)
  defp collect(_, bindings) when is_list(bindings), do: do_collect(bindings)
  defp collect(_, _), do: {[], []}

  defp do_collect(bindings, acc \\ {[], []}) do
    {users, groups} = Enum.reduce(bindings, acc, fn
      %{user_id: uid}, {users, groups} when is_binary(uid) -> {[uid | users], groups}
      %{group_id: gid}, {users, groups} when is_binary(gid) -> {users, [gid | groups]}
      _, acc -> acc
    end)
    {Enum.uniq(users), Enum.uniq(groups)}
  end
end

defimpl Console.GraphQl.Topic, for: Console.Schema.Service do
  alias Console.Deployments.Rtc.Utils
  def infer(item, _) do
    {users, groups} = Utils.audience(item)
    Enum.map(users, & "service:user:#{&1}")
    |> Enum.concat(Enum.map(groups, & "service:group:#{&1}"))
    |> Enum.concat(["service:admin"])
    |> Enum.map(& {:service_deployment_delta, &1})
  end
end

defimpl Console.GraphQl.Topic, for: Console.Schema.Cluster do
  alias Console.Deployments.Rtc.Utils
  def infer(item, _) do
    {users, groups} = Utils.audience(item)
    Enum.map(users, & "cluster:user:#{&1}")
    |> Enum.concat(Enum.map(groups, & "cluster:group:#{&1}"))
    |> Enum.concat(["cluster:admin"])
    |> Enum.map(& {:cluster_delta, &1})
  end
end

defimpl Console.GraphQl.Topic, for: Console.Schema.Pipeline do
  alias Console.Deployments.Rtc.Utils
  def infer(item, _) do
    {users, groups} = Utils.audience(item)
    Enum.map(users, & "pipeline:user:#{&1}")
    |> Enum.concat(Enum.map(groups, & "pipeline:group:#{&1}"))
    |> Enum.concat(["pipeline:admin"])
    |> Enum.map(& {:pipeline_delta, &1})
  end
end

## I need to find a way to provide authorization for this that's not a major perf drag

defimpl Console.PubSub.Rtc, for: [
  Console.PubSub.ServiceUpdated,
  Console.PubSub.ClusterUpdated,
  Console.PubSub.PipelineUpdated,
  Console.PubSub.ServiceDeleted,
  Console.PubSub.ServiceComponentsUpdated,
] do

  def deliver(_), do: :ok
  # def deliver(%{item: item}), do: {item, :update}
end

defimpl Console.PubSub.Rtc, for: [
  Console.PubSub.ServiceCreated,
  Console.PubSub.ClusterCreated,
  Console.PubSub.PipelineCreated,
] do

  def deliver(_), do: :ok
  # def deliver(%{item: item}), do:  {item, :create}
end

defimpl Console.PubSub.Rtc, for: [
  Console.PubSub.ServiceHardDeleted
] do
  def deliver(_), do: :ok
  # def deliver(%{item: item}), do: {item, :delete}
end
