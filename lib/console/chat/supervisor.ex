defmodule Console.Chat.Supervisor do
  use Supervisor
  alias Console.Chat.{DynamicSupervisor, Registrar}

  def start_link(init_arg \\ :ok) do
    Supervisor.start_link(__MODULE__, init_arg, name: __MODULE__)
  end

  def init(_init_arg) do
    children = [
      DynamicSupervisor,
      Registrar
    ]
    Supervisor.init(children, strategy: :one_for_one)
  end
end
