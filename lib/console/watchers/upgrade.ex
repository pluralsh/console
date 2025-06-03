defmodule Console.Watchers.Upgrade do
  use Console.Watchers.Base, state: [:upgrades, :queue_id, :target, :last]
  alias Console.Deployments.Statistics
  alias Console.Plural.{Upgrades, Socket}
  alias Console.Watchers.Plural

  @poll_interval 60 * 1000
  @resource_interval :timer.minutes(60)

  def handle_call(:state, _, state), do: {:reply, state, state}
  def handle_call(:ping, _, state), do: {:reply, :pong, state}

  def handle_call(:usage, _, state) do
    send self(), :usage
    {:reply, :ok, state}
  end

  defp setup_queue(state) do
    Upgrades.create_queue(%{
      git: Console.conf(:git_url),
      domain: Console.conf(:url),
      name: Console.conf(:cluster_name),
      legacy: !Console.byok?() && !Console.cloud?(),
      provider: to_provider(Console.conf(:provider))
    })
    |> case do
      {:ok, %{id: id}} ->
        Process.send_after(self(), :connect, 1000)
        {:ok, _pid} = Plural.start_wss()
        {:ok, ref} = :timer.send_interval(@poll_interval, :next)
        {:ok, _} = :timer.send_interval(@resource_interval, :svcs)
        {:noreply, %{state | queue_id: id, timer: ref}}
      err ->
        Logger.error "failed to create upgrade queue: #{inspect(err)}"
        Process.send_after(self(), :start, :timer.seconds(5))
        {:noreply, state}
    end
  end

  def handle_info(:start, state) do
    Logger.info "starting upgrades watcher"
    Logger.info "provider info: #{System.get_env("PROVIDER")}"

    case Console.Features.check_license() do
      :ignore -> setup_queue(state)
      _ ->
        Logger.info "Bypass configuring upgrade queue for sandboxed instance"
        {:noreply, state}
    end
  end

  def handle_info(:connect, state) do
    Logger.info "Joining upgrade queue channel"
    case Socket.do_join("queues:#{state.queue_id}") do
      :ok ->
        send self(), :next
        {:noreply, %{state | upgrades: "queues:#{state.queue_id}"}}
      error ->
        Logger.error "Failed to join upgrade room: #{inspect(error)}"
        Process.send_after(self(), :connect, 1000)
        {:noreply, state}
    end
  end

  def handle_info(:svcs, %{upgrades: nil} = state), do: {:noreply, state}
  def handle_info(:svcs, %{upgrades: upgrades} = state) do
    Socket.do_push(upgrades, "usage", Statistics.info())
    {:noreply, state}
  end

  def handle_info(_, state), do: {:noreply, state}

  defp to_provider(:gcp), do: "GCP"
  defp to_provider(:aws), do: "AWS"
  defp to_provider(:azure), do: "AZURE"
  defp to_provider(:equinix), do: "EQUINIX"
  defp to_provider(_), do: "CUSTOM"
end
