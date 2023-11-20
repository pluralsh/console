defmodule Console.Watchers.Supervisor do
  use Supervisor

  @optional Console.conf(:optional_watchers)

  def start_link(init_arg) do
    Supervisor.start_link(__MODULE__, init_arg, name: __MODULE__)
  end

  @impl true
  def init(_init_arg) do
    Console.conf(:watchers)
    |> filter_byok(Console.byok?())
    |> Supervisor.init(strategy: :one_for_one, max_restarts: 15)
  end

  defp filter_byok(watchers, true), do: Enum.filter(watchers, & &1 not in @optional)
  defp filter_byok(watchers, _), do: watchers
end
