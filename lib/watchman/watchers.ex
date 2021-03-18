defmodule Watchman.Watchers do
  use GenServer
  require Logger

  @watchers Watchman.conf(:watchers)

  def start_link(opts \\ []) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  def init(_) do
    send self(), :init
    :timer.send_interval(5000, :poll)
    {:ok, []}
  end

  def handle_info(:init, state) do
    Enum.each(@watchers, fn {name, module} -> start_watcher(name, module) end)

    {:noreply, state}
  end

  def handle_info(:poll, state) do
    Logger.info "ensuring all watchers are alive"
    Enum.each(@watchers, fn {name, module} ->
      try do
        GenServer.call({:via, :swarm, name}, :ping, 1000)
      catch
        :exit, error ->
          Logger.info "Watcher #{name} died due to #{inspect(error)}, restarting..."
          start_watcher(name, module)
      end
    end)

    {:noreply, state}
  end

  def handle_info(_, state), do: {:noreply, state}

  defp start_watcher(name, module) do
    try do
      Swarm.whereis_or_register_name(name, module, :start_link, [])
      |> maybe_link()
    catch
      _, error ->
        Logger.error "Failed to link due to #{inspect(error)}"
    end
  end

  defp maybe_link({:ok, pid}) when is_pid(pid), do: Process.link(pid)
  defp maybe_link(pass), do: pass
end
