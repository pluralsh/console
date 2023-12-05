defmodule Prometheus.Client do
  alias Console.Schema.DeploymentSettings.Connection
  alias Prometheus.{Response, Data, Result}
  @headers [{"content-type", "application/x-www-form-urlencoded"}]

  defstruct [:host, :user, :password]

  def host(%Connection{host: h}) when is_binary(h), do: h
  def host(_), do: host()

  def auth(%Connection{user: u, password: p}) when is_binary(u) and is_binary(p) do
    [{"Authorization", Plug.BasicAuth.encode_basic_auth(u, p)}]
  end
  def auth(_), do: []

  def host(), do: Application.get_env(:console, :prometheus)

  def query(client \\ nil, query, start, end_t, step, variables) do
    query = variable_subst(query, variables)
    HTTPoison.post(
      Path.join(host(client), "/api/v1/query_range"),
      {:form, [
        {"query", query},
        {"end", DateTime.to_iso8601(end_t)},
        {"start", DateTime.to_iso8601(start)},
        {"step", step}
      ]},
      @headers ++ auth(client)
    )
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
