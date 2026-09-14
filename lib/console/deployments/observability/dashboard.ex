defmodule Console.Deployments.Observability.Dashboard do
  alias Console.Repo
  alias Console.AI.Workbench.Toolchain
  alias Console.Schema.{Dashboard, User}
  alias Console.Schema.Dashboard.{Datasource, Graph, Input}

  @variable ~r/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/

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

  defp execute(%Dashboard{} = dashboard, %Datasource{} = datasource, input, time_range, user) do
    dashboard = Repo.preload(dashboard, :workbench)

    args =
      datasource.input
      |> substitute(input)
      |> Map.put("time_range", time_range)

    case datasource.type do
      :metrics -> Toolchain.metrics(dashboard.workbench, datasource.tool, args, user)
      :logs -> Toolchain.logs(dashboard.workbench, datasource.tool, args, user)
      :traces -> Toolchain.traces(dashboard.workbench, datasource.tool, args, user)
      :labels -> Toolchain.labels(dashboard.workbench, datasource.tool, args, user)
    end
  end

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
