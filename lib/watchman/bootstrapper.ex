defmodule Watchman.Bootstrapper do
  use GenServer
  require Logger

  @delay 4000
  @jitter 2000
  defmodule State, do: defstruct [:storage]

  def start_link(opts \\ :ok) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  def init(_) do
    if Watchman.conf(:initialize) do
      send self(), :init
    end
    send self(), :cluster
    poll()
    {:ok, %State{storage: determine_storage()}}
  end

  def servers() do
    [node() | Node.list()]
    |> Enum.map(& {:deploy, &1})
  end

  def me(), do: {:deploy, node()}

  def start_deployer(storage) do
    result = Horde.DynamicSupervisor.start_child(Watchman.Horde.Supervisor, {Watchman.Deployer, storage})
    Logger.info "testing deployer restart, result: #{inspect(result)}"
  end

  defp determine_storage(), do: Watchman.Storage.Git

  def handle_info(:init, %State{storage: storage} = state) do
    storage.init()
    {:noreply, state}
  end

  def handle_info(:cluster, %State{storage: storage} = state) do
    Watchman.Cluster.start_cluster()
    Watchman.Cluster.call({:boot, storage})
    {:noreply, state}
  end

  def handle_info(:poll, %State{storage: storage} = state) do
    poll()
    start_deployer(storage)
    {:noreply, state}
  end

  def poll(), do: Process.send_after(self(), :poll, delay())

  def delay(), do: @delay + :rand.uniform(@jitter)
end