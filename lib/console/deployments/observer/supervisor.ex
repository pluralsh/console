defmodule Console.Deployments.Observer.Supervisor do
  use DynamicSupervisor
  alias Console.Deployments.Observer.Worker

  def start_link(init_arg \\ :ok) do
    DynamicSupervisor.start_link(__MODULE__, init_arg, name: __MODULE__)
  end

  def start_child(run) do
    DynamicSupervisor.start_child(__MODULE__, {Worker, run})
  end

  @impl true
  def init(_init_arg) do
    DynamicSupervisor.init(strategy: :one_for_one)
  end
end