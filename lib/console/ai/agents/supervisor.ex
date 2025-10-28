defmodule Console.AI.Agents.Supervisor do
  use DynamicSupervisor

  def start_link(init_arg \\ :ok) do
    DynamicSupervisor.start_link(__MODULE__, init_arg, name: __MODULE__)
  end

  def start_child(module, session) do
    child = %{
      id: session.id,
      start: {module, :start_link, [session]},
      restart: :temporary
    }
    DynamicSupervisor.start_child(__MODULE__, child)
  end

  @impl true
  def init(_init_arg) do
    DynamicSupervisor.init(strategy: :one_for_one, restart: :temporary)
  end
end
