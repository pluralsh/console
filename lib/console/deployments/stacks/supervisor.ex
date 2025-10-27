defmodule Console.Deployments.Stacks.Supervisor do
  use DynamicSupervisor
  alias Console.Deployments.Stacks.Worker

  def start_link(init_arg \\ :ok) do
    DynamicSupervisor.start_link(__MODULE__, init_arg, name: __MODULE__)
  end

  def start_child(run) do
    child = %{
      id: run.id,
      start: {Worker, :start_link, [run]},
      restart: :temporary
    }
    DynamicSupervisor.start_child(__MODULE__, child)
  end

  @impl true
  def init(_init_arg) do
    DynamicSupervisor.init(strategy: :one_for_one, restart: :temporary)
  end
end
