defmodule Prometheus.Client do
  alias Console.Schema.DeploymentSettings.Connection
  alias Prometheus.{Response, Data, Result}
  require Logger

  @headers [{"content-type", "application/x-www-form-urlencoded"}]
  @timeouts [connect_options: [timeout: :timer.seconds(30)], receive_timeout: :timer.seconds(30), decode_body: false, retry: false]

  defstruct [:host, :user, :password]

  def host(%Connection{host: h}) when is_binary(h), do: h
  def host(_), do: host()

  def auth(%Connection{user: u, password: p}) when is_binary(u) and is_binary(p) do
    [{"Authorization", Plug.BasicAuth.encode_basic_auth(u, p)}]
  end
  def auth(_), do: []

  def host(), do: Application.get_env(:console, :prometheus)

  def query(client \\ nil, query, variables) do
    query = variable_subst(query, variables)

    Path.join(host(client), "/api/v1/query")
    |> Req.post([form: [{"query", query}], headers: @headers ++ auth(client)] ++ @timeouts)
    |> case do
      {:ok, %{body: body, status: 200}} -> Poison.decode(body, as: Response.spec())
      _ -> {:error, "prometheus error"}
    end
  end

  def query(client \\ nil, query, start, end_t, step, variables) do
    query = variable_subst(query, variables)
    Logger.info "Issuing prometheus query: #{query}"
    Req.post(
      Path.join(host(client), "/api/v1/query_range"),
      [form: [
        {"query", query},
        {"end", DateTime.to_iso8601(end_t)},
        {"start", DateTime.to_iso8601(start)},
        {"step", step}
      ],
      headers: @headers ++ auth(client)] ++ @timeouts
    )
    |> case do
      {:ok, %{body: body, status: 200}} -> Poison.decode(body, as: Response.spec())
      _ -> {:error, "prometheus error"}
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

  @variable ~r/\$\{([^}]+)\}|\$(\w+)/

  @doc """
  Interpolates `${var}` (or bare `$var`, for grafana-style dashboard queries) in a single pass,
  matching whole variable names so the result doesn't depend on variable order.  Unknown
  variables are left untouched and substituted values are never re-scanned.
  """
  def variable_subst(value, variables) do
    vars = Map.new(variables || [], &subst_pair/1)
    Regex.replace(@variable, value, fn whole, braced, bare ->
      Map.get(vars, if(braced == "", do: bare, else: braced), whole)
    end)
  end

  defp subst_pair(%{name: key, value: value}), do: {to_string(key), to_string(value)}
  defp subst_pair({key, value}), do: {to_string(key), to_string(value)}
  defp subst_pair(_), do: {nil, nil}
end
