defmodule Console.Mesh.Provider.Utils do
  alias Console.Mesh.{Builder, Edge}
  alias Prometheus.{Response, Data, Result}
  alias Console.Schema.DeploymentSettings.Connection
  alias Console.Mesh.Prometheus, as: Prom
  require Logger

  @spec build_graph([{atom, binary}], Connection.t, function, keyword) :: {:ok, [Edge.t]} | {:error, term}
  def build_graph(queries, prom, edge_fn, opts) when is_function(edge_fn, 2) do
    Task.async_stream(queries, fn {metric, query} -> {metric, Prom.query(prom, query, opts)} end)
    |> Enum.reduce(Builder.new(), fn
      {:ok, {metric, {:ok, %Response{data: %Data{result: results}}}}}, b ->
        Enum.reduce(results, b, &add_result(&2, metric, &1, edge_fn))
      {:ok, {_, {:error, err}}}, b ->
        Logger.warning "failed to fetch prometheus metrics: #{inspect(err)}"
        b
      {:error, err}, b ->
        Logger.warning "async task failed with error: #{inspect(err)}"
        b
    end)
    |> Builder.render()
    |> Console.Services.Base.ok()
  end

  defp add_result(%Builder{} = b, metric, %Result{metric: m, value: [ts, val]}, edge_fn)
      when is_atom(metric) and is_function(edge_fn, 2) do
    Builder.add(b, edge_fn.(metric, %Result{metric: m, value: [ts, Prom.value(val)]}))
  end
  defp add_result(b, _, _, _), do: b
end
