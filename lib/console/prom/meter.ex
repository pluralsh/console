defmodule Console.Prom.Meter do
  @moduledoc """
  A simple GenServer that counts total bytes ingested into es or vmetrics.
  """
  use GenServer

  @gb 1_000_000_000

  def start_link(opts \\ []) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  @doc """
  Collects the total bytes ingested into es or vmetrics from all nodes.
  """
  def collect() do
    Enum.reduce(Node.list(), fetch(), fn node, acc ->
      acc + fetch({__MODULE__, node})
    end)
  end

  def init(_opts), do: {:ok, 0}

  def incr(ref \\ __MODULE__, inc), do: GenServer.cast(ref, {:incr, inc})

  def fetch(ref \\ __MODULE__), do: GenServer.call(ref, :fetch)

  def handle_cast({:incr, inc}, state), do: {:noreply, state + inc}

  def handle_call(:fetch, _from, state),
    do: {:reply, floor(state / @gb), Integer.mod(state, @gb)} # reset counter after extraction
end
