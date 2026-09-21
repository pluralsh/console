defmodule Console.Deployments.Observability.Dashboard do
  alias Console.Repo
  alias Console.AI.Workbench.Toolchain
  alias Console.Schema.{Dashboard, User, Workbench, WorkbenchTool}
  alias Console.Schema.Dashboard.{Datasource, Graph, Input}

  @variable ~r/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/
  @metrics_tool_prefix "workbench_observability_metrics_"

  @spec graph(Dashboard.t(), binary, map, map, User.t()) :: {:ok, map} | Console.error()
  def graph(%Dashboard{} = dashboard, identifier, input, time_range, %User{} = user) do
    with %Graph{datasource: %Datasource{} = datasource} <- find(dashboard.graphs, identifier),
         {:ok, data} <- execute_graph(dashboard, datasource, input, time_range, user) do
      {:ok, %{datasource.type => data}}
    else
      nil -> {:error, "graph #{identifier} not found"}
      %Graph{} -> {:error, "graph #{identifier} does not have a datasource"}
      error -> error
    end
  end

  @spec input(Dashboard.t(), binary, map, map, User.t()) :: {:ok, [binary]} | Console.error()
  def input(%Dashboard{} = dashboard, identifier, input, time_range, %User{} = user) do
    with %Input{datasource: %Datasource{type: :labels} = datasource} <-
           find(dashboard.inputs, identifier),
         {:ok, labels} <- execute(dashboard, datasource, input, time_range, user) do
      {:ok, labels}
    else
      nil -> {:error, "input #{identifier} not found"}
      %Input{datasource: nil} -> {:error, "input #{identifier} does not have a datasource"}
      %Input{} -> {:error, "datasource for input #{identifier} must return labels"}
      error -> error
    end
  end

  def substitute(value, variables) do
    variables = Map.new(variables || %{}, fn {key, value} -> {to_string(key), value} end)
    do_substitute(value, variables)
  end

  defp do_substitute(value, variables) when is_map(value) do
    Map.new(value, fn {key, value} -> {key, do_substitute(value, variables)} end)
  end
  defp do_substitute(value, variables) when is_list(value),
    do: Enum.map(value, &do_substitute(&1, variables))
  defp do_substitute(value, variables) when is_binary(value) do
    Regex.replace(@variable, value, fn placeholder, name ->
      case Map.fetch(variables, name) do
        {:ok, replacement} -> stringify(replacement)
        :error -> placeholder
      end
    end)
  end
  defp do_substitute(value, _), do: value

  defp execute_graph(dashboard, %Datasource{type: type} = datasource, input, time_range, user)
       when type in [:metrics, :logs, :traces],
       do: execute(dashboard, datasource, input, time_range, user)

  defp execute_graph(_, _, _, _, _),
    do: {:error, "graph datasource must return metrics, logs, or traces"}

  @metric_target_points 240
  @metric_step_candidates [
    15,
    30,
    60,
    120,
    300,
    600,
    900,
    1_800,
    3_600,
    7_200,
    21_600,
    43_200,
    86_400,
    172_800,
  ]

  defp execute(%Dashboard{} = dashboard, %Datasource{} = datasource, input, time_range, user) do
    dashboard = Repo.preload(dashboard, workbench: :tools)

    args =
      datasource.input
      |> substitute(input)
      |> Map.put("time_range", time_range)
      |> maybe_put_metric_step(datasource, dashboard.workbench, time_range)

    case datasource.type do
      :metrics -> Toolchain.metrics(dashboard.workbench, datasource.tool, args, user)
      :logs -> Toolchain.logs(dashboard.workbench, datasource.tool, args, user)
      :traces -> Toolchain.traces(dashboard.workbench, datasource.tool, args, user)
      :labels -> Toolchain.labels(dashboard.workbench, datasource.tool, args, user)
    end
  end

  defp maybe_put_metric_step(args, %Datasource{type: :metrics} = datasource, workbench, time_range) do
    if explicit_step?(args) do
      args
    else
      case metric_query_step(time_range, metric_step_dialect(datasource, workbench)) do
        step when is_binary(step) -> Map.put(args, "step", step)
        _ -> args
      end
    end
  end
  defp maybe_put_metric_step(args, _, _, _), do: args

  defp explicit_step?(%{"step" => step}) when is_binary(step),
    do: String.trim(step) != ""
  defp explicit_step?(_), do: false

  defp metric_step_dialect(%Datasource{tool: @metrics_tool_prefix <> name}, %Workbench{tools: tools})
       when is_list(tools) do
    case Enum.find(tools, &(&1.name == name)) do
      %WorkbenchTool{tool: :dynatrace} -> :none
      %WorkbenchTool{tool: :azure, configuration: %{azure: %{prometheus_url: url}}}
        when is_binary(url) -> :prometheus
      %WorkbenchTool{tool: :azure} -> :iso8601
      _ -> :prometheus
    end
  end
  defp metric_step_dialect(_, _), do: :prometheus

  def metric_query_step(time_range, dialect \\ :prometheus)

  def metric_query_step(_, :none), do: nil
  def metric_query_step(time_range, dialect) do
    with {start_at, end_at} <- time_range_bounds(time_range),
         seconds when seconds > 0 <- DateTime.diff(end_at, start_at, :second) do
      seconds
      |> ceil_div(@metric_target_points)
      |> ceiling_candidate()
      |> format_step(dialect)
    else
      _ -> nil
    end
  end

  defp ceil_div(n, d), do: div(n + d - 1, d)

  defp ceiling_candidate(target) do
    Enum.find(@metric_step_candidates, &(&1 >= target)) || day_fallback(target)
  end

  # Larger than any static candidate: round up to whole days so the point
  # target holds for arbitrarily long ranges.
  defp day_fallback(target) do
    ceil_div(target, 86_400) * 86_400
  end

  defp format_step(seconds, :iso8601) do
    cond do
      rem(seconds, 86_400) == 0 -> "P#{div(seconds, 86_400)}D"
      rem(seconds, 3_600) == 0 -> "PT#{div(seconds, 3_600)}H"
      rem(seconds, 60) == 0 -> "PT#{div(seconds, 60)}M"
      true -> "PT#{seconds}S"
    end
  end
  defp format_step(seconds, _) do
    cond do
      rem(seconds, 86_400) == 0 -> "#{div(seconds, 86_400)}d"
      rem(seconds, 3_600) == 0 -> "#{div(seconds, 3_600)}h"
      rem(seconds, 60) == 0 -> "#{div(seconds, 60)}m"
      true -> "#{seconds}s"
    end
  end

  defp time_range_bounds(%{start: start_at, end: end_at}),
    do: {start_at, end_at}
  defp time_range_bounds(%{"start" => start_at, "end" => end_at}),
    do: {start_at, end_at}
  defp time_range_bounds(_), do: :error

  defp stringify(value) when is_list(value), do: Enum.map_join(value, ",", &stringify/1)
  defp stringify(value) when is_map(value), do: Jason.encode!(value)
  defp stringify(value), do: to_string(value)

  defp find(components, identifier) do
    Enum.find(components, fn
      %Graph{identifier: ^identifier} -> true
      %Input{name: ^identifier} -> true
      _ -> false
    end)
  end
end
