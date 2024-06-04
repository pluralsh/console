defmodule Console.Deployments.Statistics do
  alias Console.Prom.Metrics
  alias Console.Schema.{Cluster, Service}

  def compile() do
    cluster_stats()
    service_stats()
  end

  defp cluster_stats() do
    Cluster.stats()
    |> Console.Repo.one()
    |> case do
      %{unhealthy: h, count: c} ->
        Metrics.cluster(c, h)
      _ -> :ok
    end
  end

  defp service_stats() do
    Service.stats()
    |> Console.Repo.one()
    |> case do
      %{unhealthy: h, count: c} ->
        Metrics.service(c, h)
      _ -> :ok
    end
  end
end
