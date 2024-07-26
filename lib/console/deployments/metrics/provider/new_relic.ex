defmodule Console.Deployments.Metrics.Provider.NewRelic do
  @behaviour Console.Deployments.Metrics.Provider
  alias Console.Schema.{ObservableMetric, ObservabilityProvider}

  @url "https://api.newrelic.com/graphql"

  @gql """
    query Workload($guid: String!) {
      actor {
        entity(guid: $guid) {
          ... on WorkloadEntity {
            guid
            workloadStatus {
              statusValue
            }
          }
        }
      }
    }
  """

  def query(%ObservableMetric{identifier: name, provider: provider}) do
    case gql(provider, name) do
      {:ok, %{body: %{"data" => %{"actor" => %{"entity" => %{"workloadStatus" => %{"statusValue" => status}}}}}}} ->
        result(status, name)
      {:ok, %{body: body}} -> {:error, "failed to query newrelic: #{inspect(body)}"}
      _ -> {:error, {:client, "newrelic request failed"}}
    end
  end

  defp gql(%ObservabilityProvider{credentials: %{newrelic: %{api_key: api_key}}}, name) do
    Req.new(base_url: @url)
    |> Req.merge(Console.conf(__MODULE__))
    |> Req.Request.put_header("Api-Key", api_key)
    |> AbsintheClient.attach()
    |> Req.post(graphql: {@gql, %{guid: name}})
  end
  defp gql(_, _), do: {:error, "invalid newrelic credentials"}

  defp result("DISRUPTED", name), do: {:error, "newrelic workload #{name} is disrupted"}
  defp result("CRITICAL", name), do: {:error, "newrelic workload #{name} is critical"}
  defp result(_, _), do: :ok
end
