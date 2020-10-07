defmodule Watchman.Bootstrapper do
  use GenServer
  require Logger

  @delay 4000
  @jitter 2000

  def start_link(opts \\ :ok) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  def init(_) do
    poll()
    {:ok, []}
  end

  def start_deployer do
    result = Horde.DynamicSupervisor.start_child(Watchman.Horde.Supervisor, {Watchman.Deployer, determine_storage()})
    Logger.info "testing deployer restart, result: #{result}"
  end

  defp determine_storage(), do: Watchman.Storage.Git

  def handle_info(:poll, state) do
    poll()
    start_deployer()
    {:noreply, state}
  end

  def poll(), do: Process.send_after(self(), :poll, delay())

  def delay(), do: @delay + :rand.uniform(@jitter)
end