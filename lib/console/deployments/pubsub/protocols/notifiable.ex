defprotocol Console.Deployments.PubSub.Notifiable do
  @fallback_to_any true

  @doc """
  Returns the payload and topics for a graphql subscription event
  """
  @spec message(term) :: {binary, list, map} | :ok
  def message(event)
end

defimpl Console.Deployments.PubSub.Notifiable, for: Any do
  def message(_), do: :ok
end

defmodule Console.Deployments.Notifications.Utils do
  alias Console.Schema.{
    Alert,
    Service,
    Cluster,
    Pipeline,
    PullRequest,
    StackRun,
    Stack,
    AiInsight
  }

  @cache_adapter Console.conf(:cache_adapter)
  @ttl :timer.hours(1)

  def deduplicate(scope, fun, opts \\ []) do
    case @cache_adapter.get({:notif, scope}) do
      nil ->
        @cache_adapter.put({:notif, scope}, :ok, opts ++ [ttl: @ttl])
        fun.()
      res -> res
    end
  end

  def nested_dedupe([{scope, opts} | rest], fun) when is_list(opts),
    do: deduplicate(scope, fn -> nested_dedupe(rest, fun) end, opts)
  def nested_dedupe([scope | rest], fun), do: deduplicate(scope, fn -> nested_dedupe(rest, fun) end)
  def nested_dedupe([], fun) when is_function(fun), do: fun.()

  def filters(%Service{id: id, cluster_id: cid}), do: [service_id: id, cluster_id: cid]
  def filters(%Cluster{id: id}), do: [cluster_id: id]
  def filters(%Pipeline{id: id}), do: [pipeline_id: id]
  def filters(%PullRequest{url: url}), do: [regex: url]
  def filters(%StackRun{stack_id: id}), do: [stack_id: id]
  def filters(%Stack{id: id}), do: [stack_id: id]
  def filters(%Alert{} = alert) do
    Map.take(alert, ~w(service_id cluster_id project_id)a)
    |> drop_nils()
  end
  def filters(_), do: []

  def insight(%AiInsight{summary: summary}) when is_binary(summary), do: summary
  def insight(_), do: "View in Plural to see the full insight"

  defp drop_nils(map), do: Enum.filter(map, &elem(&1, 1))
end

defimpl Console.Deployments.PubSub.Notifiable, for: Console.Schema.Pipeline do
  def message(_), do: :ok
end

defimpl Console.Deployments.PubSub.Notifiable, for: Console.Schema.Cluster do
  def message(_), do: :ok
end

defimpl Console.Deployments.PubSub.Notifiable, for: [
  Console.PubSub.ServiceUpdated,
] do
  alias Console.Deployments.Notifications.Utils
  def message(%{item: svc}) do
    svc = Console.Repo.preload(svc, [:cluster, :repository])
    {"service.update", Utils.filters(svc), %{service: svc, source: source(svc)}}
  end

  defp source(%{repository: %{url: url}, git: %{ref: ref, folder: folder}}), do: %{url: url, ref: "#{folder}@#{ref}"}
  defp source(%{helm: %{chart: c, version: v}}), do: %{url: c, ref: v}
  defp source(_), do: %{}
end

defimpl Console.Deployments.PubSub.Notifiable, for: Console.PubSub.PullRequestCreated do
  alias Console.Deployments.Notifications.Utils

  def message(%{item: pr}) do
    {"pr.create", Utils.filters(pr), %{pr: pr}}
  end
end

defimpl Console.Deployments.PubSub.Notifiable, for: Console.PubSub.PullRequestUpdated do
  alias Console.Deployments.Notifications.Utils

  def message(%{item: %{status: status} = pr}) when status in ~w(merged closed)a do
    {"pr.close", Utils.filters(pr), %{pr: pr}}
  end
  def message(_), do: :ok
end

defimpl Console.Deployments.PubSub.Notifiable, for: Console.PubSub.PipelineGateUpdated do
  alias Console.Deployments.Notifications.Utils
  alias Console.Deployments.Pipelines

  def message(%{item: %{state: :pending} = gate}) do
    %{edge: %{pipeline: pipe}} = Console.Repo.preload(gate, [edge: :pipeline])
    case Pipelines.debounced?(pipe.id) do
      true -> {"pipeline.update", Utils.filters(pipe), %{pipe: pipe}}
      _ -> :ok
    end
  end
  def message(_), do: :ok
end

defimpl Console.Deployments.PubSub.Notifiable, for: Console.PubSub.StackRunCreated do
  alias Console.Deployments.Notifications.Utils
  alias Console.Schema.StackRun

  def message(%{item: %StackRun{pull_request_id: id}}) when is_binary(id), do: :ok
  def message(%{item: run}) do
    run = Console.Repo.preload(run, [:stack, :repository])
    {"stack.run", Utils.filters(run), %{stack_run: run}}
  end
end

defimpl Console.Deployments.PubSub.Notifiable, for: Console.PubSub.ServiceInsight do
  alias Console.Deployments.Notifications.Utils
  alias Console.Schema.AiInsight
  require Logger

  def message(%{item: {svc, %AiInsight{text: t, sha: sha} = insight}}) when byte_size(t) > 0 do
    Utils.nested_dedupe([
      {{:insight_sha, sha}, [ttl: :timer.hours(24)]},
      {:svc_insight, svc.id}
    ], fn ->
      svc = Console.Repo.preload(svc, [:cluster, :repository])
      {"service.insight", Utils.filters(svc), %{service: svc, insight: insight, text: Utils.insight(insight)}}
    end)
  end
  def message(_), do: :ok
end

defimpl Console.Deployments.PubSub.Notifiable, for: Console.PubSub.StackInsight do
  alias Console.Deployments.Notifications.Utils
  alias Console.Schema.AiInsight
  require Logger

  def message(%{item: {stack, %AiInsight{text: t, sha: sha} = insight}}) when byte_size(t) > 0 do
    Utils.nested_dedupe([
      {{:insight_sha, sha}, [ttl: :timer.hours(24)]},
      {:stack_insight, stack.id}
    ], fn ->
      stack = Console.Repo.preload(stack, [:cluster, :repository])
      {"stack.insight", Utils.filters(stack), %{stack: stack, insight: insight, text: Utils.insight(insight)}}
    end)
  end
  def message(_), do: :ok
end

defimpl Console.Deployments.PubSub.Notifiable, for: Console.PubSub.ClusterInsight do
  alias Console.Deployments.Notifications.Utils
  alias Console.Schema.AiInsight
  require Logger

  def message(%{item: {cluster, %AiInsight{text: t, sha: sha} = insight}}) when byte_size(t) > 0 do
    Utils.nested_dedupe([
      {{:insight_sha, sha}, [ttl: :timer.hours(24)]},
      {:cluster_insight, cluster.id}
    ], fn ->
      {"cluster.insight", Utils.filters(cluster), %{cluster: cluster, insight: insight, text: Utils.insight(insight)}}
    end)
  end
  def message(_), do: :ok
end

defimpl Console.Deployments.PubSub.Notifiable, for: Console.PubSub.AlertInsight do
  alias Console.Deployments.Notifications.Utils
  alias Console.Schema.AiInsight
  require Logger

  def message(%{item: {alert, %AiInsight{text: t, sha: sha} = insight}}) when byte_size(t) > 0 do
    Utils.nested_dedupe([
      {{:insight_sha, sha}, [ttl: :timer.hours(24)]},
      {:alert_insight, alert.id}
    ], fn ->
      alert = Console.Repo.preload(alert, [:service])
      {"alert.insight", Utils.filters(alert), %{alert: alert, insight: insight, text: Utils.insight(insight)}}
    end)
  end
  def message(_), do: :ok
end

defimpl Console.Deployments.PubSub.Notifiable, for: Console.PubSub.AlertCreated do
  alias Console.Deployments.Notifications.Utils

  def message(%{item: alert}), do: {"alert.fired", Utils.filters(alert), %{alert: alert}}
end
