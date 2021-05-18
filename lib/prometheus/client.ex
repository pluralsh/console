defmodule Prometheus.Client do
  alias Prometheus.{Response, Data, Result}
  @headers [{"content-type", "application/x-www-form-urlencoded"}]

  def host(), do: Application.get_env(:console, :prometheus)

  def query(query, start, end_t, step, variables) do
    query = variable_subst(query, variables)
    HTTPoison.post(
      Path.join(host(), "/api/v1/query_range"),
      {:form, [
        {"query", query},
        {"end", DateTime.to_iso8601(end_t)},
        {"start", DateTime.to_iso8601(start)},
        {"step", step}
      ]},
      @headers
    )
    |> IO.inspect()
    |> case do
      {:ok, %{body: body, status_code: 200}} ->
        Poison.decode(body, as: %Response{data: %Data{result: [%Result{}]}})
      error -> IO.inspect(error)
    end
  end

  @offset 60 * 60

  def extract_labels(query, label) do
    now = Timex.now()
    start = Timex.shift(now, seconds: -@offset)
    with {:ok, %Response{data: %Data{result: results}}} <- query(query, start, now, "5m", %{}) do
      results
      |> Enum.map(fn %Result{metric: metrics} -> Map.get(metrics, label) end)
      |> Enum.uniq()
    else
      _ -> []
    end
  end

  defp variable_subst(value, variables) do
    Enum.reduce(variables, value, fn
      %{name: key, value: value}, str ->
        String.replace(str, "$#{key}", value)
      _, str -> str
    end)
  end
end
