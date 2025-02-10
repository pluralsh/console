defmodule Console.AI.Evidence.Logs do
  alias Console.Repo
  alias Console.Logs.Query
  alias Console.Deployments.Settings
  alias Console.Logs.Provider, as: LogEngine
  alias Console.AI.{Provider, Tools.Logging, Evidence.Context}
  alias Console.Schema.{Service, ClusterInsightComponent, DeploymentSettings}

  require Logger

  @base [query: "error fatal exception", limit: 10]
  @format ~s({"timestamp": datetime, "log": string})

  @preface """
  The following is a description of the evidence for troubleshooting a kubernetes related issue.  Determine whether container
  log information is needed to investigate the issue.  This is normally not needed for base yaml misconfigurations, but
  can be needed for things like crash loops, OOM errors or other errors that can only be caused by software running in a
  container.
  """

  @spec with_logging(Provider.history, Service.t | ClusterInsightComponent.t) :: Context.t
  def with_logging(history, parent, opts \\ []) do
    force = Keyword.get(opts, :force, false)
    args  = Keyword.take(opts, ~w(lines q)a)
    with %DeploymentSettings{logging: %{enabled: true}} <- Settings.cached(),
         true <- use_logs?(history, force),
         {:ok, query} <- query(parent, args),
         {:ok, [_ | _] = logs} <- LogEngine.query(query) do
      history
      |> Context.new()
      |> Context.prompt({:user, "I've also found some relevant log data, listed below in format #{@format}:"})
      |> Context.reduce(logs, &Context.prompt(&2, {:user, Jason.encode!(Map.take(&1, ~w(timestamp log)a))}))
      |> Context.evidence(%{type: :log, logs: log_attrs(query, logs)})
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
  defp query(_, _), do: {:error, :invalid_parent}

  defp build_query(resource, args), do: {:ok, %{Query.new(args) | resource: resource}}

  defp log_attrs(%Query{} = q, lines) do
    Map.take(q, ~w(service_id cluster_id)a)
    |> Map.put(:lines, Enum.map(lines, &Map.take(&1, ~w(timestamp log)a)))
  end

  defp use_logs?(_, true), do: true
  defp use_logs?(history, _) do
    case Provider.tool_call(history, [Logging], preface: @preface) do
      {:ok, [%{logging: %{result: %Logging{required: true}}} | _]} -> true
      _ -> false
    end
  end
end
