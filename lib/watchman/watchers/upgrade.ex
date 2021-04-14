defmodule Watchman.Watchers.Upgrade do
  use Watchman.Watchers.Base, state: [:upgrades, :queue_id, :target, :last]
  alias PhoenixClient.{Channel, Message}
  alias Watchman.Plural.Upgrades
  alias Watchman.Watchers.Handlers

  @socket_name Application.get_env(:watchman, :socket)
  @poll_interval 60 * 1000

  def handle_info(:start, state) do
    Logger.info "starting upgrades watcher"
    Logger.info "provider info: #{System.get_env("PROVIDER")}"

    {:ok, %{id: id}} = Upgrades.create_queue(%{
      git: Watchman.conf(:git_url),
      domain: Watchman.conf(:url),
      name: Watchman.conf(:cluster_name),
      provider: to_provider(Watchman.conf(:provider))
    })

    Process.send_after(self(), :connect, 1000)
    :timer.send_interval(@poll_interval, :next)
    {:noreply, %{state | queue_id: id}}
  end

  defp to_provider(:gcp), do: "GCP"
  defp to_provider(:aws), do: "AWS"
  defp to_provider(:azure), do: "AZURE"
  defp to_provider(_), do: "CUSTOM"

  def handle_info(:connect, state) do
    with {:ok, _, upgrade} <- Channel.join(@socket_name, "queues:#{state.queue_id}") do
      send self(), :next
      {:noreply, %{state | upgrades: upgrade}}
    else
      error ->
        Logger.error "Failed to join upgrade room: #{inspect(error)}"
        Process.send_after(self(), :connect, 1000)
        {:noreply, state}
    end
  end

  def handle_info(:next, %{upgrades: upgrades} = state) do
    with {:ok, %{"id" => id} = result} <- Channel.push(upgrades, "next", %{}),
         {:ok, _} <- Handlers.Upgrade.create_build(IO.inspect(result)),
         _ <- Channel.push(upgrades, "ack", %{"id" => id}) do
      {:noreply, %{state | last: id}}
    else
      error ->
        Logger.info "Failed to deliver upgrade: #{inspect(error)}"
        {:noreply, state}
    end
  end

  def handle_info(%Message{event: "more", payload: %{"target" => id}}, state) do
    if is_nil(state.last) || id > state.last do
      send self(), :next
    end

    {:noreply, %{state | target: id}}
  end

  def handle_info(%Message{event: "phx_error", payload: %{reason: {:remote, :closed}}}, state) do
    Logger.info "Remote closed, reconnecting"
    Process.send_after(self(), :connect, 1000)
    {:noreply, state}
  end

  def handle_info(msg, state) do
    IO.inspect(msg)
    {:noreply, state}
  end
end
