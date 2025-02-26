defmodule Console.AI.PubSub.Vector.Consumer do
  use Piazza.PubSub.Consumer,
    broadcaster: Console.PubSub.Broadcaster,
    max_demand: 10
  alias Console.AI.{PubSub.Vectorizable, VectorStore}
  require Logger

  def handle_event(event) do
    case VectorStore.enabled?() do
      true -> Vectorizable.resource(event) |> insert()
      _ -> :ok
    end
  end

  defp insert({:ok, [_ | _] = resources}), do: Enum.each(resources, &VectorStore.insert/1)
  defp insert({:ok, res}), do: VectorStore.insert(res)
  defp insert(pass), do: pass
end
