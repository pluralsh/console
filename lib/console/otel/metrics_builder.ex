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
  Returns a stream of cluster health and upgradeability metrics.
  Must be called within a Repo.transaction for Repo.stream to work.
  """
  @spec cluster_metrics_stream(DateTime.t()) :: Enumerable.t()
  def cluster_metrics_stream(timestamp \\ DateTime.utc_now()) do
    Cluster
    |> Cluster.ordered(asc: :id)
    |> Cluster.preloaded([:project, :upgrade_insights])
    |> Repo.stream(method: :keyset)
    |> Console.throttle(count: 500, pause: 50)
    |> Stream.flat_map(&build_cluster_metrics(&1, timestamp))
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
  Builds cluster health and upgradeability metrics from a Cluster struct.
  Returns a list containing one health metric and zero or more upgrade metrics.
  """
  @spec build_cluster_metrics(Cluster.t(), DateTime.t()) :: [map()]
  def build_cluster_metrics(%Cluster{} = cluster, timestamp) do
    project = cluster.project

    base_attrs = %{
      cluster_id: cluster.id,
      cluster_name: cluster.name,
      cluster_handle: cluster.handle,
      project_id: project && project.id,
      project_name: project && project.name,
      distro: to_string(cluster.distro),
      version: cluster.version,
      current_version: cluster.current_version
    }

    health_metric = %{
      name: "plural.cluster.health",
      value: cluster_health_to_value(cluster),
      timestamp: timestamp,
      attributes: Map.put(base_attrs, :healthy, Cluster.healthy?(cluster))
    }

    upgrade_metrics =
      (cluster.upgrade_insights || [])
      |> Enum.map(fn insight ->
        %{
          name: "plural.cluster.upgradeability",
          value: upgrade_status_to_value(insight.status),
          timestamp: timestamp,
          attributes:
            base_attrs
            |> Map.put(:target_version, insight.version)
            |> Map.put(:insight_name, insight.name)
            |> Map.put(:status, to_string(insight.status))
        }
      end)

    [health_metric | upgrade_metrics]
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

  @doc """
  Converts a cluster's health state to a numeric value.
  """
  @spec cluster_health_to_value(Cluster.t()) :: integer()
  def cluster_health_to_value(%Cluster{} = cluster) do
    if Cluster.healthy?(cluster), do: 1, else: 0
  end

  @doc """
  Converts an upgrade insight status to a numeric value.
  """
  @spec upgrade_status_to_value(atom()) :: integer()
  def upgrade_status_to_value(:passing), do: 1
  def upgrade_status_to_value(:warning), do: 0
  def upgrade_status_to_value(:unknown), do: -1
  def upgrade_status_to_value(:failed), do: -2
  def upgrade_status_to_value(_), do: -1

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
