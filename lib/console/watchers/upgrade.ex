defmodule Console.Watchers.Upgrade do
  use Console.Watchers.Base, state: [:upgrades, :queue_id, :target, :last, :poll_timer, :resource_timer, :cluster]
  alias Console.Deployments.Statistics
  alias Console.Plural.{Upgrades}

  @poll_interval 60 * 1000
  @resource_interval :timer.minutes(60)

  def handle_call(:state, _, state), do: {:reply, state, state}
  def handle_call(:ping, _, state), do: {:reply, :pong, state}

  def handle_call(:usage, _, state) do
    send self(), :usage
    {:reply, :ok, state}
  end

  defp start_timers(%{poll_timer: nil} = state) do
    {:ok, ref} = :timer.send_interval(@resource_interval, :svcs)
    {:ok, pref} = :timer.send_interval(@poll_interval, :poll)
    cluster_attrs = %{
      gitUrl: Console.conf(:git_url),
      domain: Console.conf(:url),
      consoleUrl: Console.conf(:url),
      name: Console.conf(:cluster_name),
      legacy: !Console.byok?() && !Console.cloud?(),
      provider: to_provider(Console.conf(:provider))
    }
    %{state  | poll_timer: pref, resource_timer: ref, cluster: cluster_attrs}
  end
  defp start_timers(state), do: state

  def handle_info(:start, state) do
    Logger.info "starting upgrades watcher"
    Logger.info "provider info: #{System.get_env("PROVIDER")}"

    case Console.Features.check_license() do
      :ignore -> start_timers(state)
      _ ->
        Logger.info "Bypass configuring upgrade queue for sandboxed instance"
        {:noreply, state}
    end
  end

  def handle_info(:svcs, %{resource_timer: t, cluster: %{} = cluster} = state) when not is_nil(t) do
    Upgrades.ping_cluster(cluster, to_gql(Statistics.info()))
    |> IO.inspect(label: "ping cluster resp")
    {:noreply, state}
  end

  def handle_info(:poll, %{poll_timer: t, cluster: %{} = cluster} = state) when not is_nil(t) do
    Upgrades.ping_cluster(cluster, nil)
    |> IO.inspect(label: "ping cluster resp w/o resources")
    {:noreply, state}
  end

  def handle_info(_, state), do: {:noreply, state}

  defp to_provider(:gcp), do: "GCP"
  defp to_provider(:aws), do: "AWS"
  defp to_provider(:azure), do: "AZURE"
  defp to_provider(:equinix), do: "EQUINIX"
  defp to_provider(_), do: "CUSTOM"

  defp to_gql(stats) do
    Console.move(stats, [:bytes_ingested], [:bytesIngested])
  end
end
