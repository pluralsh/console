defmodule Console.Deployments.Statistics do
  import Console.Prom.Plugin, only: [metric_scope: 1]
  alias Console.Repo
  alias Console.Schema.{Cluster, Service, Stack}

  def info() do
    %{
      clusters: Repo.aggregate(Cluster, :count, :id),
      services: Repo.aggregate(Service, :count, :id)
    }
  end

  def compile() do
    cluster_stats()
    service_stats()
    stack_stats()
  end

  defp cluster_stats() do
    Cluster.stats()
    |> Console.Repo.one()
    |> case do
      %{unhealthy: h, count: c} ->
        :telemetry.execute(metric_scope(:cluster_count), %{total: c}, %{})
        :telemetry.execute(metric_scope(:unhealthy_cluster_count), %{total: h}, %{})
      _ -> :ok
    end
  end

  defp service_stats() do
    Service.stats()
    |> Console.Repo.one()
    |> case do
      %{unhealthy: h, count: c} ->
        :telemetry.execute(metric_scope(:service_count), %{total: c}, %{})
        :telemetry.execute(metric_scope(:failed_service_count), %{total: h}, %{})
      _ -> :ok
    end
  end

  defp stack_stats() do
    Stack.stats()
    |> Console.Repo.one()
    |> case do
      %{unhealthy: h, count: c} ->
        :telemetry.execute(metric_scope(:stack_count), %{total: c}, %{})
        :telemetry.execute(metric_scope(:failed_stack_count), %{total: h}, %{})
      _ -> :ok
    end
  end
end
