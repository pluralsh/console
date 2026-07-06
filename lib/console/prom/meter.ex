defmodule Console.Prom.Meter do
  @moduledoc """
  A simple GenServer that counts total bytes ingested into es or vmetrics.
  """
  use GenServer

  defmodule State do
    defstruct [ingest: 0, tokens: 0]
  end

  @gb 1_000_000_000

  def start_link(opts \\ []) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  @doc """
  Collects the total bytes ingested into es or vmetrics from all nodes.
  """
  def collect() do
    Enum.reduce(Node.list(), fetch(), fn node, acc ->
      Map.merge(acc, fetch({__MODULE__, node}), fn _, v1, v2 -> v1 + v2 end)
    end)
  end

  def init(_opts), do: {:ok, %State{}}

  def incr(ref \\ __MODULE__, inc), do: GenServer.cast(ref, {:incr, inc})

  def incr_tokens(ref \\ __MODULE__, %ReqLLM.Response{} = result), do: GenServer.cast(ref, {:tokens, ReqLLM.Response.usage(result)})

  def fetch(ref \\ __MODULE__), do: GenServer.call(ref, :fetch)

  def handle_cast({:incr, inc}, %State{ingest: ingest} = state), do: {:noreply, %{state | ingest: ingest + inc}}
  def handle_cast({:tokens, %{total_tokens: tokens}}, %State{tokens: total} = state) when is_integer(tokens), do: {:noreply, %{state | tokens: total + tokens}}
  def handle_cast(_, state), do: {:noreply, state}

  def handle_call(:fetch, _from, %State{ingest: ingest, tokens: tokens} = state),
    do: {:reply, %{bytes_ingested: floor(ingest / @gb), tokens: tokens}, %{state | ingest: Integer.mod(ingest, @gb), tokens: 0}} # reset counter after extraction
end
