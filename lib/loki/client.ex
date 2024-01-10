defmodule Loki.Client do
  alias Loki.{Response, Data, Result, Value}
  alias Console.Schema.DeploymentSettings.Connection

  def host(%Connection{host: h}) when is_binary(h), do: h
  def host(_), do: host()

  def auth(%Connection{user: u, password: p}) when is_binary(u) and is_binary(p) do
    [{"Authorization", Plug.BasicAuth.encode_basic_auth(u, p)}]
  end
  def auth(_), do: []

  def host(), do: Application.get_env(:console, :loki)

  def query(client \\ nil, query, start_ts, end_ts, limit) do
    query = URI.encode_query(%{"query" => query, "start" => start_ts, "end" => end_ts, "limit" => limit})

    host(client)
    |> Path.join("/loki/api/v1/query_range?#{query}")
    |> HTTPoison.get(headers() ++ auth(client))
    |> case do
      {:ok, %{body: body, status_code: 200}} ->
        {:ok, body
              |> Poison.decode(as: %Response{data: %Data{result: [%Result{}]}})
              |> convert()}
      error ->
        IO.inspect(error)
        {:error, "loki error"}
    end
  end

  defp convert({:ok, %Response{data: %Data{result: results}} = resp}) when is_list(results) do
    results = Enum.map(results, fn %{values: values} = result ->
      %{result | values: Enum.map(values, fn [ts, v] -> %Value{timestamp: String.to_integer(ts), value: v} end)}
    end)
    put_in(resp.data.result, results)
  end
  defp convert(error), do: error

  def headers(base \\ []) do
    case Console.conf(:grafana_tenant) do
      nil -> base
      tenant -> [{"X-Scope-OrgID", tenant} | base]
    end
  end
end
