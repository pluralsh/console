defmodule Console.Prom.Metrics do
  use Prometheus.Metric

  defmacrop metric_name(name), do: :"plural_console_#{name}"

  def setup() do
    Gauge.declare([name: metric_name(:git_agent_count),
                   labels: [:url],
                   help: "Count of active git agents in this Console node"])

    Gauge.declare([name: metric_name(:local_cache_file_count),
                   help: "Count of the number of files w/in local caches at the moment"])

    Gauge.declare([name: metric_name(:local_cache_filesize),
                   help: "Count of the number of files w/in local caches at the moment"])

    Gauge.declare([name: metric_name(:failed_service_count),
                   help: "Count of number of services with errors"])

    Gauge.declare([name: metric_name(:service_count),
                   help: "Count of number of services with errors"])

    Gauge.declare([name: metric_name(:cluster_count),
                   help: "Count of number of clusters"])

    Gauge.declare([name: metric_name(:unhealthy_cluster_count),
                   help: "Count of unhealthy (unpinged) clusters"])
  end

  def inc(:git_agent, label) do
    Gauge.inc([name: metric_name(:git_agent_count), labels: [label]])
  end

  def dec(:git_agent, label) do
    Gauge.dec([name: metric_name(:git_agent_count), labels: [label]])
  end

  def filecache(count, size) do
    Gauge.set([name: metric_name(:local_cache_file_count)], count)
    Gauge.set([name: metric_name(:local_cache_filesize)], size)
  end

  def cluster(count, unhealthy) do
    Gauge.set([name: metric_name(:cluster_count)], safe(count))
    Gauge.set([name: metric_name(:unhealthy_cluster_count)], safe(unhealthy))
  end

  def service(count, failed) do
    Gauge.set([name: metric_name(:service_count)], safe(count))
    Gauge.set([name: metric_name(:failed_service_count)], safe(failed))
  end

  defp safe(val), do: val || 0
end
