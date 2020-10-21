defmodule Watchman.Bootstrapper do
  use GenServer
  require Logger

  defmodule State, do: defstruct [:storage]

  def start_link(opts \\ :ok) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  def init(_) do
    if Watchman.conf(:initialize) do
      send self(), :init
    end
    send self(), :cluster
    {:ok, %State{storage: determine_storage()}}
  end

  def handle_info(:init, %State{storage: storage} = state) do
    storage.init()
    {:noreply, state}
  end

  def handle_info(:cluster, %State{storage: storage} = state) do
    Watchman.Cluster.start_cluster()
    Watchman.Cluster.call({:boot, storage})
    {:noreply, state}
  end

  defp determine_storage, do: Watchman.Storage.Git
end