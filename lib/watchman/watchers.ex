defmodule Watchman.Watchers do
  use GenServer

  @watchers Watchman.conf(:watchers)

  def start_link(opts \\ []) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  def init(_) do
    send self(), :init
    {:ok, []}
  end

  def handle_info(:init, state) do
    Enum.each(@watchers, fn {name, module} ->
      Swarm.whereis_or_register_name(name, module, :start_link, [])
    end)
    {:noreply, state}
  end

  def handle_info(_, state), do: {:noreply, state}
end