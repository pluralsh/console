defmodule Console.Prom.Plugin do
  use PromEx.Plugin
  alias Console.Deployments.Statistics

  def metric_scope(:git_agent), do: ~w(console git agent)a
  def metric_scope(:cluster_count), do: ~w(console cluster count)a
  def metric_scope(:unhealthy_cluster_count), do: ~w(console unhealthy cluster count)a
  def metric_scope(:service_count), do: ~w(console service count)a
  def metric_scope(:failed_service_count), do: ~w(console failed service count)a
  def metric_scope(:stack_count), do: ~w(console stack count)a
  def metric_scope(:failed_stack_count), do: ~w(console failed stack count)a
  def metric_scope(:file_count), do: ~w(console file count)a
  def metric_scope(:file_size), do: ~w(console file size)a
  def metric_scope(:erlang_nodes), do: ~w(console erlang nodes count)a

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
      fs_poller(poll_rate),
      dist_poller(:timer.seconds(10))
    ]
  end

  defp db_poller(poll_rate) do
    Polling.build(
      :console_poll_db,
      poll_rate,
      {Statistics, :compile, []},
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
        last_value(
          [:stack, :count],
          event_name: metric_scope(:stack_count),
          description: "The total number of stacks managed by this instance.",
          measurement: :total
        ),
        last_value(
          [:failed, :stack, :count],
          event_name: metric_scope(:failed_stack_count),
          description: "The total number of stacks managed by this instance.",
          measurement: :total
        ),
      ]
    )
  end

  defp fs_poller(poll_rate) do
    Polling.build(
      :console_poll_fs,
      poll_rate,
      {Statistics, :compile, []},
      [
        # Capture the total number of files and disk utilization from console file caches
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

  defp dist_poller(poll_rate) do
    Polling.build(
      :console_poll_fs,
      poll_rate,
      {Statistics, :compile_erlang, []},
      [
        # Capture the total number of files and disk utilization from console file caches
        last_value(
          [:erlang, :nodes, :count],
          event_name: metric_scope(:erlang_nodes),
          description: "The total number of erlang nodes.",
          measurement: :total
        ),
      ]
    )
  end
end
