defmodule Console.Watchers.Upgrade do
  use Console.Watchers.Base, state: [:upgrades, :queue_id, :target, :last]
  import Console.Services.Base, only: [
    start_transaction: 0,
    add_operation: 3,
    execute: 1
  ]
  alias PhoenixClient.{Channel, Message}
  alias Console.Plural.Upgrades
  alias Console.Watchers.Handlers

  @socket_name Application.get_env(:console, :socket)
  @poll_interval 60 * 1000

  def handle_info(:start, state) do
    Logger.info "starting upgrades watcher"
    Logger.info "provider info: #{System.get_env("PROVIDER")}"

    {:ok, %{id: id}} = Upgrades.create_queue(%{
      git: Console.conf(:git_url),
      domain: Console.conf(:url),
      name: Console.conf(:cluster_name),
      provider: to_provider(Console.conf(:provider))
    })

    Process.send_after(self(), :connect, 1000)
    {:ok, ref} = :timer.send_interval(@poll_interval, :next)
    {:noreply, %{state | queue_id: id, timer: ref}}
  end

  def handle_info(:connect, state) do
    Logger.info "Joining upgrade queue channel"
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
         true <- Console.Bootstrapper.git_enabled?() do
      start_transaction()
      |> add_operation(:build, fn _ -> Handlers.Upgrade.create_build(result) end)
      |> add_operation(:ack, fn _ -> Channel.push(upgrades, "ack", %{"id" => id}) end)
      |> execute()
      |> case do
        {:ok, _} -> {:noreply, %{state | last: id}}
        _ -> {:noreply, state} # add some retry logic?
      end
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

  def handle_info(_, state), do: {:noreply, state}

  defp to_provider(:gcp), do: "GCP"
  defp to_provider(:aws), do: "AWS"
  defp to_provider(:azure), do: "AZURE"
  defp to_provider(_), do: "CUSTOM"
end
