defmodule Watchman.Watchers.Upgrade do
  use Watchman.Watchers.Base, state: [:upgrades, :user_id, :target, :last]
  alias PhoenixClient.{Channel, Message}
  alias Watchman.Forge.Users
  alias Watchman.Watchers.Handlers

  @socket_name Application.get_env(:watchman, :socket)
  @poll_interval 60 * 1000

  def handle_info(:start, state) do
    Logger.info "starting upgrades watcher"
    {:ok, %{"id" => id}} = Users.me()
    Process.send_after(self(), :connect, 1000)
    :timer.send_interval(@poll_interval, :next)
    {:noreply, %{state | user_id: id}}
  end

  def handle_info(:connect, state) do
    with {:ok, _, upgrade} <- Channel.join(@socket_name, "upgrades:#{state.user_id}") do
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
         {:ok, _} <- Handlers.Upgrade.create_build(result),
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
