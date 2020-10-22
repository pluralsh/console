defmodule Watchman.Bootstrapper do
  use GenServer
  require Logger

  defmodule State, do: defstruct [:storage, :ref]

  def start_link(opts \\ :ok) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  def init(_) do
    Process.flag(:trap_exit, true)
    if Watchman.conf(:initialize) do
      send self(), :init
    end
    send self(), :cluster
    {:ok, %State{storage: Watchman.storage(), ref: make_ref()}}
  end

  def kick(), do: GenServer.cast(__MODULE__, :start)

  def handle_info(:init, %State{storage: storage} = state) do
    storage.init()
    {:noreply, state}
  end

  def handle_info(:cluster, state) do
    case Watchman.Cluster.start_cluster() do
      :ok -> :ok
      {:error, {:shutdown, {:failed_to_start_child, :deploy, {:already_started, _}}}} -> :ok
    end
    {:noreply, state}
  end

  def handle_info(_, state), do: {:noreply, state}
end