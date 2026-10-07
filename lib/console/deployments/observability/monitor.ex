defmodule Console.Deployments.Observability.Monitor do
  alias Console.Schema.{Monitor, Service, Cluster, User, Workbench}
  alias Console.Schema.Monitor.{Query, Query.LogQuery, Query.MetricsQuery}
  alias Console.Logs.Query, as: LQ
  alias Console.Logs.{Provider, Time}
  alias Console.AI.Workbench.Toolchain
  alias Console.AI.Tools.Workbench.Observability.TimeRange
  alias Console.AI.Tools.Workbench.Observability.Plrl.Metrics, as: PlrlMetrics
  require EEx
  require Logger

  def alert_attrs(%Monitor{id: id, name: name} = monitor, results) do
    with {:ok, msg} <- description(monitor.alert_template, monitor, results) do
      %{
        title: "Plural Monitor #{name} is firing",
        type: :plural,
        severity: monitor.severity,
        message: msg,
        state: :firing,
        fingerprint: id,
        monitor_id: monitor.id,
        timeseries: %{
          metrics: Enum.map(results, & %{timestamp: &1.timestamp, value: &1.count}),
          threshold: monitor.threshold.value
        }
      }
      |> Map.merge(Map.take(monitor, [:service_id, :workbench_id]))
      |> then(& {:ok, &1})
    end
  end

  @spec query(Monitor.t) :: {:ok, :firing | :resolved, list} | Console.error
  def query(%Monitor{type: :log} = monitor), do: log_query(monitor)
  def query(%Monitor{type: :metrics} = monitor), do: metrics_query(monitor)

  defp log_query(
    %Monitor{
      query: %Query{
        log: %LogQuery{tool: tool} = query
      }
    } = monitor
  ) do
    with {:ok, results} <- execute_log_query(monitor, query, tool) do
      results
      |> Enum.map(& &1.count)
      |> calc(monitor.threshold, results)
    end
  end

  defp metrics_query(
    %Monitor{query: %Query{metrics: %MetricsQuery{tool: tool} = query}} = monitor
  ) do
    with {:ok, results} <- execute_metrics_query(monitor, query, tool) do
      samples = Enum.map(results, &metric_sample/1)

      samples
      |> Enum.map(& &1.count)
      |> calc(monitor.threshold, samples)
    end
  end

  defp execute_log_query(
    %Monitor{} = monitor,
    %LogQuery{} = query,
    tool
  ) when is_binary(tool) and byte_size(tool) > 0 do
    with {:ok, workbench, user} <- tool_context(monitor) do
      Toolchain.log_aggregate(workbench, tool, log_tool_args(query, monitor), user)
    end
  end
  defp execute_log_query(%Monitor{} = monitor, %LogQuery{} = query, _) do
    %LQ{
      query: query.query,
      bucket_size: query.bucket_size,
      facets: query.facets,
      operator: query.operator,
      resource: monitor.service,
      time: Time.new(duration: Console.convert_duration!(query.duration || "1h"))
    }
    |> Provider.aggregate()
  end

  defp execute_metrics_query(
    %Monitor{} = monitor,
    %MetricsQuery{} = query,
    tool
  ) when is_binary(tool) and byte_size(tool) > 0 do
    with {:ok, workbench, user} <- tool_context(monitor) do
      Toolchain.metrics(workbench, tool, metrics_tool_args(query), user)
    end
  end
  defp execute_metrics_query(_, %MetricsQuery{} = query, _) do
    %PlrlMetrics{
      query: query.query,
      step: query.step,
      time_range: time_range(query.duration)
    }
    |> PlrlMetrics.structured()
  end

  defp tool_context(%Monitor{workbench: %Workbench{} = workbench, user: %User{} = user}),
    do: {:ok, workbench, user}
  defp tool_context(_),
    do: {:error, "tool-backed monitor queries require a workbench and user"}

  defp log_tool_args(%LogQuery{} = query, %Monitor{} = monitor) do
    %{
      query: query.query,
      bucket_size: query.bucket_size,
      operator: query.operator,
      facets: Enum.map(query.facets || [], & %{name: &1.key, value: &1.value}),
      options: Console.mapify(query.options),
      service_id: monitor.service_id,
      time_range: time_range_args(query.duration)
    }
  end

  defp metrics_tool_args(%MetricsQuery{} = query) do
    %{
      query: query.query,
      step: query.step,
      options: Console.mapify(query.options),
      time_range: time_range_args(query.duration)
    }
  end

  defp time_range(duration) do
    now = Timex.now()

    %TimeRange{
      start: Timex.subtract(now, Console.convert_duration!(duration || "1h")),
      end: now
    }
  end

  defp time_range_args(duration) do
    duration
    |> time_range()
    |> Map.from_struct()
    |> Map.drop([:id])
  end

  defp metric_sample(%{timestamp: timestamp, value: value}),
    do: %{timestamp: timestamp, count: value}

  defp calc(vector, %Monitor.Threshold{aggregate: agg, value: value}, results) when is_list(vector) and is_float(value) do
    case (aggregate(vector, agg) / 1) >= value do
      true -> {:ok, :firing, results}
      false -> {:ok, :resolved, results}
    end
  end
  defp calc(_, _, _), do: {:error, "invalid metrics vector"}

  defp aggregate([], _), do: 0.0
  defp aggregate(vector, :max), do: Enum.max(vector)
  defp aggregate(vector, :min), do: Enum.min(vector)
  defp aggregate(vector, :avg), do: Enum.sum(vector) / length(vector)

  @solid_opts [strict_variables: true, strict_filters: true]

  defp description(template, monitor, results) when is_binary(template) and byte_size(template) > 0 do
    result_map = Console.mapify(results) |> Console.string_map()
    with {:ok, tpl} <- Solid.parse(template),
         {:ok, res, _} <- Solid.render(tpl, %{"monitor" => monitor_context(monitor), "results" => result_map}, @solid_opts) do
      {:ok, IO.iodata_to_binary(res)}
    else
      err ->
        Logger.warning("Error rendering monitor description: #{inspect(err)}")
        {:ok, "#{template}\n\n(P.S. there was an error in monitor template rendering: #{inspect(err)})"}
    end
  end
  defp description(_, monitor, results), do: {:ok, String.trim(monitor_md(monitor: monitor, results: results))}

  EEx.function_from_file(:defp, :monitor_md, Path.join([:code.priv_dir(:console), "monitor.md.eex"]), [:assigns])

  defp monitor_context(%Monitor{} = monitor) do
    Console.mapify(monitor)
    |> Map.put(:service, service_attrs(monitor.service))
    |> Console.string_map()
  end

  defp service_attrs(%Service{} = service),
    do: %{name: service.name, namespace: service.namespace, cluster: cluster_attrs(service.cluster)}
  defp service_attrs(_), do: nil

  defp cluster_attrs(%Cluster{} = cluster),
    do: %{name: cluster.name, handle: cluster.handle, version: cluster.current_version, distro: cluster.distro}
  defp cluster_attrs(_), do: nil
end
