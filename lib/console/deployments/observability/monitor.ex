defmodule Console.Deployments.Observability.Monitor do
  alias Console.Schema.{Monitor, Service, Cluster}
  alias Console.Schema.Monitor.{Query, Query.LogQuery}
  alias Console.Logs.Query, as: LQ
  alias Console.Logs.{Provider, Time}
  require EEx

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

  defp log_query(
    %Monitor{
      query: %Query{
        log: %LogQuery{query: query, bucket_size: bucket_size, facets: facets, duration: dur} = q
      }
    } = monitor
  ) do
    %LQ{
      query: query,
      bucket_size: bucket_size,
      facets: facets,
      operator: q.operator,
      resource: monitor.service,
      time: Time.new(duration: Console.convert_duration!(dur || "1h"))
    }
    |> Provider.aggregate()
    |> case do
      {:ok, results} ->
        Enum.map(results, & &1.count)
        |> calc(monitor.threshold, results)
      err -> err
    end
  end

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
    with {:parse, {:ok, tpl}} <- {:parse, Solid.parse(template)},
         {:render, {:ok, res, _}} <- {:render, Solid.render(tpl, %{"monitor" => monitor_context(monitor), "results" => result_map}, @solid_opts)} do
      {:ok, IO.iodata_to_binary(res)}
    else
      {:parse, {:error, %Solid.TemplateError{} = err}} -> {:error, Solid.TemplateError.message(err)}
      {:render, {:error, errs, _}} -> {:error, Enum.map(errs, &inspect/1) |> Enum.join(", ")}
    end
  end
  defp description(_, monitor, results), do: {:ok, monitor_md(monitor: monitor, results: results)}

  EEx.function_from_file(:defp, :monitor_md, Path.join([:code.priv_dir(:console), "monitor.md.eex"]), [:assigns], trim: true)

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
