defmodule Console.GraphQl.Resolvers.Deployments.Observability do
  use Console.GraphQl.Resolvers.Deployments.Base
  alias Console.Schema.{DeploymentSettings, ObservabilityProvider}
  alias Console.Deployments.{Settings, Observability}
  alias Console.Services.Observability, as: ObsSvc

  @default_offset 30 * 60
  @nano 1_000_000_000

  def get_observability_provider(%{id: id}, _) when is_binary(id), do: {:ok, Observability.get_provider!(id)}
  def get_observability_provider(%{name: n}, _) when is_binary(n), do: {:ok, Observability.get_provider_by_name!(n)}

  def list_observability_providers(args, _) do
    ObservabilityProvider.ordered()
    |> paginate(args)
  end

  def upsert_observability_provider(%{attributes: attrs}, %{context: %{current_user: user}}),
    do: Observability.upsert_provider(attrs, user)

  def delete_observability_provider(%{id: id}, %{context: %{current_user: user}}),
    do: Observability.delete_provider(id, user)

  def cluster_logs(cluster, %{query: query} = args, _) do
    with_client(:loki, fn ->
      {start, end_ts} = timestamps(args)
      add_label(query, %{name: "cluster", value: cluster.handle})
      |> ObsSvc.get_logs(end_ts, start, args[:limit])
    end)
  end

  def service_logs(service, %{query: query} = args, _) do
    with_client(:loki, fn ->
      service = Console.Repo.preload(service, [:cluster])

      {start, end_ts} = timestamps(args)
      add_label(query, %{name: "namespace", value: service.namespace})
      |> add_label(%{name: "cluster", value: service.cluster.handle})
      |> ObsSvc.get_logs(end_ts, start, args[:limit])
    end)
  end

  defp add_label(%{labels: labels} = query, label), do: %{query | labels: [label | labels]}

  defp timestamps(args) do
    now    = Timex.now()
    start  = (args[:start] || ts(now)) / @nano
    end_ts = (args[:end] || ((start - @default_offset) * @nano)) / @nano
    {start, end_ts}
  end

  def ts(ts), do: Timex.to_unix(ts) * @nano

  defp with_client(client, closure) do
    with %DeploymentSettings{} = settings <- Settings.fetch(),
         %DeploymentSettings.Connection{} = conn <- find(settings, client),
         _ <- ObsSvc.put_connection(client, conn) do
      closure.()
    else
      _ -> {:error, "Observability settings for #{client} not configured"}
    end
  end

  defp find(%DeploymentSettings{loki_connection: loki}, :loki), do: loki
  defp find(%DeploymentSettings{prometheus_connection: prometheus}, :prometheus), do: prometheus
  defp find(_, _), do: nil
end
