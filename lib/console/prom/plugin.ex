defmodule Console.Prom.Plugin do
  use PromEx.Plugin

  def metric_scope(:git_agent), do: [:console, :git, :agent]
  def metric_scope(:cluster_count), do: [:console, :cluster, :count]
  def metric_scope(:unhealthy_cluster_count), do: [:console, :unhealthy, :cluster, :count]
  def metric_scope(:service_count), do: [:console, :service, :count]
  def metric_scope(:failed_service_count), do: [:console, :failed, :service, :count]
  def metric_scope(:file_count), do: [:console, :file, :count]
  def metric_scope(:file_size), do: [:console, :file, :size]

  @impl true
  def event_metrics(_opts) do
    Event.build(
      :console_prom_event_metrics,
      [
        sum(
          [:git, :agent, :count],
          event_name: metric_scope(:git_agent),
          measurement: :count,
          description: "The number of running git agents.",
          tags: [:url]
        )
      ]
    )
  end

  @impl true
  def polling_metrics(opts) do
    poll_rate = Keyword.get(opts, :poll_rate, :timer.seconds(30))

    [
      db_poller(poll_rate),
      fs_poller(poll_rate)
    ]
  end

  defp db_poller(poll_rate) do
    Polling.build(
      :console_poll_db,
      poll_rate,
      {Console.Deployments.Statistics, :compile, []},
      [
        last_value(
          [:cluster, :count],
          event_name: metric_scope(:cluster_count),
          description: "The total number of clusters managed by this instance.",
          measurement: :total
        ),
        last_value(
          [:unhealthy, :cluster, :count],
          event_name: metric_scope(:unhealthy_cluster_count),
          description: "The total number of clusters managed by this instance.",
          measurement: :total
        ),
        last_value(
          [:service, :count],
          event_name: metric_scope(:service_count),
          description: "The total number of services managed by this instance.",
          measurement: :total
        ),
        last_value(
          [:failed, :service, :count],
          event_name: metric_scope(:failed_service_count),
          description: "The total number of services managed by this instance.",
          measurement: :total
        ),
      ]
    )
  end

  defp fs_poller(poll_rate) do
    Polling.build(
      :console_poll_fs,
      poll_rate,
      {Console.Deployments.Git.Statistics, :disk, []},
      [
        # Capture the total memory allocated to the entire Erlang VM (or BEAM for short)
        last_value(
          [:local, :cache, :file, :count],
          event_name: metric_scope(:file_count),
          description: "The total number of files w/in local caches.",
          measurement: :total
        ),
        last_value(
          [:local, :cache, :filesize],
          event_name: metric_scope(:file_size),
          description: "The total disk utilization from console file caches.",
          measurement: :total
        ),
      ]
    )
  end
end
