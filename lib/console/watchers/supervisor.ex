defmodule Console.Watchers.Supervisor do
  use Supervisor

  def start_link(init_arg) do
    Supervisor.start_link(__MODULE__, init_arg, name: __MODULE__)
  end

  @impl true
  def init(_init_arg) do
    Console.conf(:watchers)
    |> maybe_plural()
    |> Supervisor.init(strategy: :one_for_one, max_restarts: 15)
  end

  defp maybe_plural(children) do
    case Console.conf(:initialize) do
      true -> children ++ [Console.Watchers.Plural.worker()]
      _ -> children
    end
  end
end
