defmodule Watchman.Bootstrapper do
  use GenServer
  require Logger

  defmodule State, do: defstruct [:storage]

  def start_link(opts \\ :ok) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  def init(_) do
    Process.flag(:trap_exit, true)
    if Watchman.conf(:initialize) do
      send self(), :init
    end
    send self(), :cluster
    send self(), :start
    {:ok, %State{storage: determine_storage()}}
  end

  def kick(), do: GenServer.cast(__MODULE__, :start)

  def handle_info(:init, %State{storage: storage} = state) do
    storage.init()
    {:noreply, state}
  end

  def handle_info(:cluster, state) do
    :ok = Watchman.Cluster.start_cluster()
    {:noreply, state}
  end

  def handle_info(:start, %State{storage: storage} = state) do
    start_if_not_present(storage)
    {:noreply, state}
  end

  def handle_info(_, state), do: {:noreply, state}

  def handle_cast(:start, %State{storage: storage} = state) do
    start_if_not_present(storage)
    {:noreply, state}
  end

  defp start_if_not_present(storage) do
    me = self()
    with :ok <- Watchman.Cluster.lock(me),
         {:ok, pid} = start_deployer(storage),
         :ok <- Watchman.Cluster.save(pid),
         :ok <- Watchman.Cluster.unlock(me),
      do: send self(), :finish
  end

  def terminate(_, _), do: :ok

  defp start_deployer(storage), do: Watchman.Deployer.start_link(storage)

  defp determine_storage, do: Watchman.Storage.Git
end