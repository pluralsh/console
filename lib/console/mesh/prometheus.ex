defmodule Console.Mesh.Prometheus do
  alias Prometheus.Response
  alias Console.Schema.{DeploymentSettings}

  @headers [{"content-type", "application/x-www-form-urlencoded"}]

  def value(v) when is_binary(v), do: Console.Cost.Utils.to_float(v)
  def value(v), do: v

  def query(conn, query, opts \\ []) do
    Path.join(conn.host, "/api/v1/query")
    |> HTTPoison.post({:form, form([{"query", query}], Map.new(opts))}, headers(conn))
    |> IO.inspect()
    |> case do
      {:ok, %HTTPoison.Response{body: body, status_code: 200}} ->
        Poison.decode(body, as: Response.spec())
      _ -> {:error, "prometheus error"}
    end
  end

  defp form(base, %{time: %{} = ts}), do: [{"time", DateTime.to_iso8601(ts)} | base]
  defp form(base, %{time: ts}) when is_binary(ts), do: [{"time", ts} | base]
  defp form(base, _), do: base

  defp headers(%DeploymentSettings.Connection{user: u, password: p}) when is_binary(u) and is_binary(p) do
    [{"Authorization", Plug.BasicAuth.encode_basic_auth(u, p)} | @headers]
  end
  defp headers(_), do: @headers
end
