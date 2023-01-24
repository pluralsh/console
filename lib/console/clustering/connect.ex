defmodule Console.Clustering.Connect do
  use GenServer
  require Logger
  alias ETS.KeyValueSet

  @table :console_connector

  defmodule State, do: defstruct [:table]

  def start_link(opts \\ :ok) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  def init(_) do
    {:ok, table} = KeyValueSet.new(name: @table, read_concurrency: true, ordered: true)
    {:ok, %State{table: table}}
  end

  def connect(node) do
    Logger.info "connecting to node=#{inspect(node)}"
    case state(:isolate) do
      true -> :ignored
      _ -> :net_kernel.connect_node(node)
    end
  end

  def state(key, default \\ nil) do
    case KeyValueSet.wrap_existing(@table) do
      {:ok, table} -> table[key]
      _ -> default
    end
  end

  def isolate(), do: GenServer.call(__MODULE__, :isolate)

  def handle_call(:isolate, _, %State{table: table} = state) do
    {:reply, :ok, %{state | table: KeyValueSet.put!(table, :isolate, true)}}
  end
end
