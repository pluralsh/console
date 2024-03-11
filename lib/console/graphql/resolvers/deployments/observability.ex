defmodule Console.GraphQl.Resolvers.Deployments.Observability do
  use Console.GraphQl.Resolvers.Deployments.Base
  alias Console.Schema.DeploymentSettings
  alias Console.Deployments.Settings
  alias Console.Services.Observability

  @default_offset 30 * 60
  @nano 1_000_000_000

  def cluster_logs(cluster, %{query: query} = args, _) do
    with_client(:loki, fn ->
      {start, end_ts} = timestamps(args)
      add_label(query, %{name: "cluster", value: cluster.handle})
      |> Observability.get_logs(end_ts, start, args[:limit])
    end)
  end

  def service_logs(service, %{query: query} = args, _) do
    with_client(:loki, fn ->
      {start, end_ts} = timestamps(args)
      add_label(query, %{name: "namespace", value: service.namespace})
      |> Observability.get_logs(end_ts, start, args[:limit])
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
         _ <- Observability.put_connection(client, conn) do
      closure.()
    else
      _ -> {:error, "Observability settings for #{client} not configured"}
    end
  end

  defp find(%DeploymentSettings{loki_connection: loki}, :loki), do: loki
  defp find(%DeploymentSettings{prometheus_connection: prometheus}, :prometheus), do: prometheus
  defp find(_, _), do: nil
end
