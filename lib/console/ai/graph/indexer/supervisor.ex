defmodule Console.AI.Graph.Indexer.Supervisor do
  use Supervisor
  alias Console.AI.Graph.Indexer.{Source, Sink}

  def start_link(init_arg) do
    Supervisor.start_link(__MODULE__, init_arg, name: __MODULE__)
  end

  @impl true
  def init(_init_arg) do
    children = [
      Source,
      Sink
    ]

    Supervisor.init(children, strategy: :one_for_one)
  end
end
