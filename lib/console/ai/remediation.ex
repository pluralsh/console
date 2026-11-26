defmodule Console.AI.Remediation do
  @moduledoc """
  Starts workbench jobs for cluster insight components that clear a cluster's auto-remediation policy.
  """
  use Console.Services.Base
  import Console.Deployments.Policies
  alias Console.Deployments.Workbenches
  alias Console.Services.Rbac
  alias Console.Schema.{
    AiInsight,
    Cluster,
    ClusterInsightComponent,
    Service,
    User,
    Workbench,
    WorkbenchJob
  }

  require EEx

  @active ~w(pending running paused)a
  @ranks %{low: 1, medium: 2, high: 3, critical: 4}

  @spec remediate(Cluster.t | binary) :: {:ok, [WorkbenchJob.t]} | :ok | Console.error
  def remediate(%Cluster{id: id}), do: remediate(id)
  def remediate(id) when is_binary(id) do
    Repo.transaction(fn ->
      id
      |> lock_cluster()
      |> do_remediate()
      |> commit_or_rollback()
    end)
    |> unwrap()
  end

  defp lock_cluster(id) do
    %Cluster{id: id}
    |> Repo.locked()
    |> Repo.preload(insight_components: [insight: :remediation_job])
  end

  defp commit_or_rollback({:error, reason}), do: Repo.rollback(reason)
  defp commit_or_rollback(result), do: result

  defp unwrap({:ok, result}), do: result
  defp unwrap({:error, reason}), do: {:error, reason}

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

  defp eligible?(%ClusterInsightComponent{priority: priority, insight: %AiInsight{text: text, sha: sha} = insight}, %Cluster{} = cluster)
      when is_binary(text) and byte_size(text) > 0 and is_binary(sha) do
    meets_priority?(priority, cluster) and not throttled?(insight, cluster)
  end
  defp eligible?(_, _), do: false

  defp meets_priority?(priority, %Cluster{} = cluster), do: rank(priority) >= rank(min_priority(cluster))

  defp rank(priority), do: Map.get(@ranks, priority, 0)

  defp throttled?(%AiInsight{} = insight, %Cluster{} = cluster) do
    active_job?(insight) or (same_finding?(insight) and within_window?(insight, cluster))
  end

  defp same_finding?(%AiInsight{sha: sha, remediated_sha: sha}) when is_binary(sha), do: true
  defp same_finding?(_), do: false

  defp active_job?(%AiInsight{remediation_job: %WorkbenchJob{status: status}}) when status in @active, do: true
  defp active_job?(%AiInsight{remediation_job: %WorkbenchJob{}}), do: false
  defp active_job?(%AiInsight{remediation_job_id: id}) when is_binary(id) do
    case Repo.get(WorkbenchJob, id) do
      %WorkbenchJob{status: status} when status in @active -> true
      _ -> false
    end
  end
  defp active_job?(_), do: false

  defp within_window?(%AiInsight{remediated_at: %DateTime{} = at}, %Cluster{} = cluster) do
    DateTime.compare(at, window_start(cluster)) != :lt
  end
  defp within_window?(_, _), do: false

  defp under_cap?(%Cluster{} = cluster) do
    count =
      WorkbenchJob.for_cluster(cluster.id)
      |> WorkbenchJob.inserted_since(window_start(cluster))
      |> Repo.aggregate(:count, :id)

    count < max_jobs(cluster)
  end

  defp create_job(%ClusterInsightComponent{insight: %AiInsight{} = insight} = comp, %Cluster{} = cluster, %Workbench{} = bench) do
    attrs = %{
      prompt: render(cluster, comp),
      cluster_id: cluster.id,
      modes: job_modes(cluster)
    }

    with {:ok, user} <- remediation_actor(cluster, bench),
         {:ok, job} <- Workbenches.create_workbench_job(attrs, bench, user),
         {:ok, _} <- mark_remediated(insight, job),
      do: {:ok, job}
  end

  defp mark_remediated(%AiInsight{} = insight, %WorkbenchJob{} = job) do
    AiInsight.remediated_changeset(insight, %{
      remediated_sha: insight.sha,
      remediated_at: DateTime.utc_now(),
      remediation_job_id: job.id
    })
    |> Repo.update()
  end

  defp job_modes(%Cluster{remediation: %{modes: modes}}) when not is_nil(modes), do: Console.mapify(modes)
  defp job_modes(_), do: %{}

  defp remediation_actor(%Cluster{remediation: %{user_id: id}}, bench) when is_binary(id) do
    with %User{} = user <- preload_actor(Repo.get(User, id)),
         {:ok, _} <- allow(preload_workbench(bench), user, :read) do
      {:ok, user}
    else
      nil -> {:error, "remediation user not found"}
      _ -> {:error, "remediation user cannot read this workbench"}
    end
  end
  defp remediation_actor(_, %Workbench{bot_user: %User{} = bot}), do: {:ok, Rbac.preload(bot)}
  defp remediation_actor(_, _), do: {:error, "workbench does not have a bot user"}

  defp preload_actor(nil), do: nil
  defp preload_actor(%User{} = user), do: user |> Rbac.preload() |> Repo.preload(:groups)

  defp preload_workbench(%Workbench{} = bench) do
    Repo.preload(bench, [:read_bindings, :write_bindings, project: [:read_bindings, :write_bindings]])
  end

  defp min_priority(%Cluster{remediation: %{min_priority: priority}}) when not is_nil(priority), do: priority
  defp min_priority(_), do: :high

  defp max_jobs(%Cluster{remediation: %{max_jobs: max}}) when is_integer(max) and max > 0, do: max
  defp max_jobs(_), do: 3

  defp window(%Cluster{remediation: %{window: window}}) when is_integer(window) and window > 0, do: window
  defp window(_), do: 21_600

  defp window_start(%Cluster{} = cluster), do: window_start(window(cluster))
  defp window_start(window) when is_integer(window) and window > 0,
    do: DateTime.add(DateTime.utc_now(), -window, :second)

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

  EEx.function_from_file(:defp, :prompt, Console.priv_filename(["prompts", "workbench", "cluster_insight.md.eex"]), [:assigns])
end
