defmodule Console.AI.Evidence.Logs do
  alias Console.Repo
  alias Console.Logs.{Query, Time, Line}
  alias Console.Deployments.Settings
  alias Console.Logs.Provider, as: LogEngine
  alias Console.AI.{Provider, Tools.Logging, Evidence.Context}
  alias Console.Schema.{Service, ClusterInsightComponent, Cluster, DeploymentSettings}

  require Logger

  @type parent :: Service.t | ClusterInsightComponent.t | Cluster.t

  @base [query: "error fatal exception fail failed failure warning warn", limit: 10]

  @logs_preface "I've found some relevant log data, which I'll list below alongside some potentially useful contextual logs before and after:"

  @preface """
  The following is a description of the evidence for troubleshooting a kubernetes related issue.  Determine whether container
  log information is needed to investigate the issue.  This is normally not needed for base yaml misconfigurations, but
  can be needed for things like crash loops, OOM errors or other errors that can only be caused by software running in a
  container.
  """

  @spec with_logging(Provider.history, parent) :: Context.t
  def with_logging(history, parent, opts \\ []) do
    force = Keyword.get(opts, :force, false)
    args  = Keyword.take(opts, ~w(lines q namespaces)a)
    with %DeploymentSettings{logging: %{enabled: true}} <- Settings.cached(),
         true <- use_logs?(history, force),
         {:ok, query} <- query(parent, args),
         {:ok, [_ | _] = logs} <- LogEngine.query(query) do
      ctx = Context.new(history) |> Context.prompt({:user, @logs_preface})

      Enum.reduce(add_context(logs, query), ctx, fn {before, line, aft}, acc ->
        lines = before ++ [line] ++ aft
        Context.prompt(acc, {:user, "Here's the next batch of log data:"})
        |> Context.reduce(lines, &Context.prompt(&2, {:user, encode!(&1)}))
        |> Context.evidence(%{type: :log, logs: log_attrs(query, line, lines)})
      end)
    else
      _ ->
        Logger.debug "skipping log analysis"
        Context.new(history)
    end
  end

  defp query(%Service{} = svc, args), do: build_query(svc, args ++ @base ++ [service_id: svc.id])
  defp query(%ClusterInsightComponent{namespace: ns} = comp, args) when is_binary(ns) do
    %{cluster: cluster} = Repo.preload(comp, [:cluster])
    build_query(cluster, args ++ @base ++ [cluster_id: cluster.id, namespaces: [comp.namespace]])
  end
  defp query(%Cluster{} = cluster, args), do: build_query(cluster, args ++ @base ++ [cluster_id: cluster.id])
  defp query(_, _), do: {:error, :invalid_parent}

  defp build_query(resource, args), do: {:ok, %{Query.new(args) | resource: resource}}

  defp log_attrs(%Query{} = q, %Line{log: log}, lines) do
    Map.take(q, ~w(service_id cluster_id)a)
    |> Map.put(:line, log)
    |> Map.put(:lines, Enum.map(lines, &Map.take(&1, ~w(timestamp log)a)))
  end

  defp add_context([_ | _] = lines, %Query{} = q), do: Enum.map(lines, &add_context(&1, q))
  defp add_context(%Line{timestamp: ts, facets: facets, log: log} = line, %Query{} = q) do
    facets = Enum.filter(facets || [], &keep_facet?(&1.key))
    with q = %{q | query: nil, facets: facets},
         {:ok, before} <- LogEngine.query(%{q | time: Time.new(before: ts)}),
         {:ok, aft} <- LogEngine.query(%{q | time: Time.new(after: ts, reverse: true)}) do
      prev = MapSet.new([line | before], & {&1.timestamp, &1.log})
      {Enum.reject(before, & &1.timestamp == ts && &1.log == log), line, Enum.reject(aft, &MapSet.member?(prev, {&1.timestamp, &1.log}))}
    else
      _ -> {[], line, []}
    end
  end

  defp keep_facet?("kubernetes" <> _), do: true
  defp keep_facet?("pod" <> _), do: true
  defp keep_facet?("namespace" <> _), do: true
  defp keep_facet?(_), do: false

  defp encode!(%Line{timestamp: ts, log: log}), do: Jason.encode!(%{timestamp: ts, log: log})

  defp use_logs?(_, true), do: true
  defp use_logs?(history, _) do
    case Provider.tool_call(history, [Logging], preface: @preface) do
      {:ok, [%{logging: %{result: %Logging{required: true}}} | _]} -> true
      _ -> false
    end
  end
end
