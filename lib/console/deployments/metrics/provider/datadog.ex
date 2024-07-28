defmodule Console.Deployments.Metrics.Provider.Datadog do
  @behaviour Console.Deployments.Metrics.Provider
  alias Console.Schema.{ObservableMetric, ObservabilityProvider}

  require Logger

  defmodule Connection do
    alias Console.Schema.{ObservabilityProvider}
    defstruct [:api_key, :app_key, host: "https://api.datadoghq.com"]

    def new(%ObservabilityProvider{credentials: %{datadog: %{api_key: api_key, app_key: app_key}}}) do
      {:ok, %__MODULE__{api_key: api_key, app_key: app_key}}
    end
    def new(_), do: {:error, "invalid datadog api credentials"}

    def headers(%__MODULE__{api_key: api_key, app_key: app_key}) do
      [{"DD-API-KEY", api_key}, {"DD-APPLICATION-KEY", app_key}, {"Accept", "application/json"}]
    end
  end

  def query(%ObservableMetric{identifier: name, provider: provider}) do
    query = URI.encode_query(%{"name" => name})
    with {:ok, conn} <- Connection.new(provider),
         {:ok, res} <- get(conn, "/api/v1/monitor?#{query}") do
      case Enum.find(listify(res), & &1["overall_state"] == "Alert") do
        nil -> :ok
        %{"message" => msg} -> {:error, msg}
        %{"name" => n} -> {:error, "Monitor #{n} is firing"}
      end
    end
  end

  defp get(conn, url) do
    HTTPoison.get("#{conn.host}#{url}", Connection.headers(conn))
    |> handle_response()
  end

  defp listify(l) when is_list(l), do: l
  defp listify(v), do: [v]

  defp handle_response({:ok, %HTTPoison.Response{status_code: code, body: body}})
    when code >= 200 and code < 300, do: Jason.decode(body)
  defp handle_response({:ok, %HTTPoison.Response{body: body}}), do: {:error, {:client, "datadog api call failed: #{body}"}}
  defp handle_response(_), do: {:error, {:client, "unknown datadog error"}}
end
