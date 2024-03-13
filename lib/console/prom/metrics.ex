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
end
