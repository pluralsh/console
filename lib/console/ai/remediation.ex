defmodule Console.AI.Remediation do
  @moduledoc """
  Starts workbench jobs for cluster insight components that clear a cluster's auto-remediation policy.
  """
  use Console.Services.Base
  alias Console.Deployments.Workbenches
  alias Console.Schema.{
    AiInsight,
    Cluster,
    ClusterInsightComponent,
    Service,
    Workbench,
    WorkbenchJob
  }

  require EEx

  @active ~w(pending running paused)a
  @ranks %{low: 1, medium: 2, high: 3, critical: 4}

  @spec remediate(Cluster.t | binary) :: {:ok, [WorkbenchJob.t]} | :ok | Console.error
  def remediate(%Cluster{id: id}), do: remediate(id)
  def remediate(id) when is_binary(id) do
    Cluster
    |> Repo.get(id)
    |> Repo.preload(insight_components: :insight)
    |> do_remediate()
  end

  defp do_remediate(%Cluster{remediation_workbench_id: id} = cluster) when is_binary(id) do
    Workbench
    |> Repo.get(id)
    |> Repo.preload(:bot_user)
    |> dispatch_cluster(cluster)
  end
  defp do_remediate(_), do: :ok

  defp dispatch_cluster(%Workbench{} = bench, %Cluster{} = cluster) do
    cluster.insight_components
    |> Enum.filter(&eligible?(&1, cluster))
    |> dispatch(cluster, bench, [])
  end
  defp dispatch_cluster(_, _), do: :ok

  defp dispatch([], _, _, []), do: :ok
  defp dispatch([], _, _, jobs), do: {:ok, Enum.reverse(jobs)}
  defp dispatch([comp | rest], %Cluster{} = cluster, %Workbench{} = bench, jobs) do
    with true <- under_cap?(cluster),
         {:ok, job} <- create_job(comp, cluster, bench) do
      dispatch(rest, cluster, bench, [job | jobs])
    else
      false -> finish(jobs)
      {:error, _} = error -> error
    end
  end

  defp finish([]), do: :ok
  defp finish(jobs), do: {:ok, Enum.reverse(jobs)}

  defp eligible?(%ClusterInsightComponent{priority: priority, insight: %AiInsight{text: text, sha: sha}} = comp, %Cluster{} = cluster)
      when is_binary(text) and byte_size(text) > 0 and is_binary(sha) do
    meets_priority?(priority, cluster.remediation_min_priority) and not throttled?(comp, cluster, sha)
  end
  defp eligible?(_, _), do: false

  defp meets_priority?(priority, min), do: rank(priority) >= rank(min || :high)

  defp rank(priority), do: Map.get(@ranks, priority, 0)

  defp throttled?(%ClusterInsightComponent{} = comp, %Cluster{} = cluster, sha) do
    key = ClusterInsightComponent.key(comp)
    active?(cluster.id, key) or recent_sha?(cluster, key, sha)
  end

  defp active?(cluster_id, key) do
    WorkbenchJob.for_cluster(cluster_id)
    |> WorkbenchJob.for_component_key(key)
    |> WorkbenchJob.for_statuses(@active)
    |> Repo.exists?()
  end

  defp recent_sha?(%Cluster{} = cluster, key, sha) do
    WorkbenchJob.for_cluster(cluster.id)
    |> WorkbenchJob.for_component_key(key)
    |> WorkbenchJob.for_insight_sha(sha)
    |> WorkbenchJob.inserted_since(window_start(cluster.remediation_window))
    |> Repo.exists?()
  end

  defp under_cap?(%Cluster{remediation_max_jobs: max} = cluster) when is_integer(max) and max > 0 do
    count =
      WorkbenchJob.for_cluster(cluster.id)
      |> WorkbenchJob.inserted_since(window_start(cluster.remediation_window))
      |> Repo.aggregate(:count, :id)

    count < max
  end
  defp under_cap?(_), do: false

  defp create_job(%ClusterInsightComponent{} = comp, %Cluster{} = cluster, %Workbench{} = bench) do
    Workbenches.create_workbench_bot_job(%{
      prompt: render(cluster, comp),
      cluster_id: cluster.id,
      component_key: ClusterInsightComponent.key(comp),
      insight_sha: comp.insight.sha
    }, bench)
  end

  defp render(%Cluster{} = cluster, %ClusterInsightComponent{} = comp) do
    String.trim(prompt(
      cluster: cluster,
      component: comp,
      insight: comp.insight,
      services: related_services(comp, cluster),
      api_version: api_version(comp)
    ))
  end

  defp related_services(%ClusterInsightComponent{namespace: ns}, %Cluster{id: id}) when is_binary(ns) do
    Service.for_cluster(id)
    |> Service.in_k8s_namespace(ns)
    |> Repo.all()
  end
  defp related_services(_, _), do: []

  defp api_version(%ClusterInsightComponent{group: group, version: version}) when is_binary(group) and group != "",
    do: "#{group}/#{version}"
  defp api_version(%ClusterInsightComponent{version: version}) when is_binary(version), do: version
  defp api_version(_), do: "unknown"

  defp window_start(window) when is_integer(window) and window > 0,
    do: DateTime.add(DateTime.utc_now(), -window, :second)
  defp window_start(_), do: DateTime.add(DateTime.utc_now(), -21_600, :second)

  EEx.function_from_file(:defp, :prompt, Console.priv_filename(["prompts", "workbench", "cluster_insight.md.eex"]), [:assigns])
end
