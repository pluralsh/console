defmodule Console.Bootstrapper do
  use GenServer
  require Logger

  defmodule State, do: defstruct [:storage, :ref]

  def start_link(opts \\ :ok) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  def init(_) do
    Process.flag(:trap_exit, true)
    if Console.conf(:initialize) do
      send self(), :init
    end
    # send self(), :cluster
    {:ok, %State{storage: Console.storage(), ref: make_ref()}}
  end

  def kick(), do: GenServer.cast(__MODULE__, :start)

  def handle_info(:init, %State{storage: storage} = state) do
    {:ok, _} = storage.init()
    {:noreply, state}
  end

  def handle_info(_, state), do: {:noreply, state}
end
