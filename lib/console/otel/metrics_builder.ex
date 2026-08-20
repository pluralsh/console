defmodule Console.Otel.MetricsBuilder do
  @moduledoc """
  Builds OpenTelemetry metrics from database entities.
  Pure functions for transforming clusters and services into metric data structures.
  """
  alias Console.Repo
  alias Console.Schema.{Cluster, Service}

  @doc """
  Returns a stream of service health metrics.
  Must be called within a Repo.transaction for Repo.stream to work.
  """
  @spec service_metrics_stream(DateTime.t()) :: Enumerable.t()
  def service_metrics_stream(timestamp \\ DateTime.utc_now()) do
    Service
    |> Service.ordered(asc: :id)
    |> Service.preloaded([cluster: :project])
    |> Repo.stream(method: :keyset)
    |> Console.throttle(count: 500, pause: 50)
    |> Stream.map(&build_service_metric(&1, timestamp))
  end

  @doc """
  Returns aggregate cluster health metrics.
  Must be called within a Repo.transaction for Repo.stream to work.
  """
  @spec cluster_health_metrics(DateTime.t()) :: [map()]
  def cluster_health_metrics(timestamp \\ DateTime.utc_now()) do
    {total, healthy} =
      Cluster
      |> Cluster.ordered(asc: :id)
      |> Repo.stream(method: :keyset)
      |> Console.throttle(count: 500, pause: 50)
      |> Enum.reduce({0, 0}, fn cluster, {total, healthy} ->
        {total + 1, healthy + if(Cluster.healthy?(cluster), do: 1, else: 0)}
      end)

    [
      %{name: "plural.cluster.health.total", value: total, timestamp: timestamp, attributes: %{}},
      %{name: "plural.cluster.health.healthy", value: healthy, timestamp: timestamp, attributes: %{}},
      %{
        name: "plural.cluster.health.unhealthy",
        value: total - healthy,
        timestamp: timestamp,
        attributes: %{}
      }
    ]
  end

  @doc """
  Builds a single service health metric from a Service struct.
  """
  @spec build_service_metric(Service.t(), DateTime.t()) :: map()
  def build_service_metric(%Service{} = service, timestamp) do
    cluster = service.cluster
    project = cluster && cluster.project

    %{
      name: "plural.service.health",
      value: service_status_to_value(service.status),
      timestamp: timestamp,
      attributes: %{
        service_id: service.id,
        service_name: service.name,
        namespace: service.namespace,
        cluster_id: cluster && cluster.id,
        cluster_name: cluster && cluster.name,
        cluster_handle: cluster && cluster.handle,
        project_id: project && project.id,
        project_name: project && project.name,
        git_ref: get_in_safe(service, [:git, :ref]),
        git_folder: get_in_safe(service, [:git, :folder]),
        helm_chart: get_in_safe(service, [:helm, :chart]),
        helm_version: get_in_safe(service, [:helm, :version]),
        status: to_string(service.status)
      }
    }
  end

  @doc """
  Converts a service status atom to a numeric value for the metric.
  """
  @spec service_status_to_value(atom()) :: integer()
  def service_status_to_value(:healthy), do: 2
  def service_status_to_value(:synced), do: 1
  def service_status_to_value(:stale), do: 0
  def service_status_to_value(:failed), do: -1
  def service_status_to_value(:paused), do: -2
  def service_status_to_value(_), do: 0

  defp get_in_safe(struct, keys) do
    Enum.reduce_while(keys, struct, fn key, acc ->
      case acc do
        nil -> {:halt, nil}
        %{} = map -> {:cont, Map.get(map, key)}
        _ -> {:halt, nil}
      end
    end)
  end
end
