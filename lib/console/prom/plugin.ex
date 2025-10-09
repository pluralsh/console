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
  def metric_scope(:persisted_query_hit), do: ~w(console persisted query hit)a
  def metric_scope(:persisted_query_miss), do: ~w(console persisted query miss)a

  def plural_metric(name), do: [:plrl | name]

  @impl true
  def event_metrics(_opts) do
    Event.build(
      :console_prom_event_metrics,
      [
        sum(
          plural_metric(~w(git agent count)a),
          event_name: metric_scope(:git_agent),
          measurement: :count,
          description: "The number of running git agents.",
          tags: [:url]
        ),
        sum(
          plural_metric(~w(persisted query hit)a),
          event_name: metric_scope(:persisted_query_hit),
          measurement: :count,
          description: "The number of persisted query hits."
        ),
        sum(
          plural_metric(~w(persisted query miss)a),
          event_name: metric_scope(:persisted_query_miss),
          measurement: :count,
          description: "The number of persisted query misses."
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
          plural_metric(~w(cluster count)a),
          event_name: metric_scope(:cluster_count),
          description: "The total number of clusters managed by this instance.",
          measurement: :total
        ),
        last_value(
          plural_metric(~w(unhealthy cluster count)a),
          event_name: metric_scope(:unhealthy_cluster_count),
          description: "The total number of clusters managed by this instance.",
          measurement: :total
        ),
        last_value(
          plural_metric(~w(service count)a),
          event_name: metric_scope(:service_count),
          description: "The total number of services managed by this instance.",
          measurement: :total
        ),
        last_value(
          plural_metric(~w(failed service count)a),
          event_name: metric_scope(:failed_service_count),
          description: "The total number of services managed by this instance.",
          measurement: :total
        ),
        last_value(
          plural_metric(~w(stack count)a),
          event_name: metric_scope(:stack_count),
          description: "The total number of stacks managed by this instance.",
          measurement: :total
        ),
        last_value(
          plural_metric(~w(failed stack count)a),
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
          plural_metric(~w(local cache file count)a),
          event_name: metric_scope(:file_count),
          description: "The total number of files w/in local caches.",
          measurement: :total
        ),
        last_value(
          plural_metric(~w(local cache filesize)a),
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
          plural_metric(~w(erlang nodes count)a),
          event_name: metric_scope(:erlang_nodes),
          description: "The total number of erlang nodes.",
          measurement: :total
        ),
      ]
    )
  end
end
