defmodule Console.Pipelines.Supervisor do
  use Supervisor
  alias Console.Pipelines.{GlobalService, Stack}

  def start_link(init_arg) do
    Supervisor.start_link(__MODULE__, init_arg, name: __MODULE__)
  end

  @impl true
  def init(_init_arg) do
    children = [
      GlobalService.Producer,
      Stack.Producer,
      {GlobalService.Pipeline, GlobalService.Producer},
      {Stack.Pipeline, Stack.Producer}
    ]
    Supervisor.init(children, strategy: :one_for_one, max_restarts: 15)
  end
end
