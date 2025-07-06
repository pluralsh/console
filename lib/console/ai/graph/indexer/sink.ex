defmodule Console.AI.Graph.Indexer.Sink do
  use GenServer
  alias Console.AI.Graph.Provider

  defmodule Chunk do
    defstruct [:connection, :chunk]
  end

  @poll :timer.minutes(1)

  def start_link(opts \\ []) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  def init(_opts) do
    :timer.send_interval(@poll, :poll)
    {:ok, []}
  end

  def ingest(%Chunk{} = chunk) do
    GenServer.call(__MODULE__, {:ingest, chunk})
  end

  def handle_call({:ingest, %Chunk{} = chunk}, _from, state), do: {:reply, :ok, [chunk | state]}

  def handle_info(:poll, state) do
    Enum.each(state, fn %Chunk{connection: conn, chunk: chunk} -> Provider.bulk_index(conn, chunk) end)
    {:noreply, []}
  end
  def handle_info(_, state), do: {:noreply, state}
end
