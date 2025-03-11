defmodule Console.AI.PubSub.Vector.Consumer do
  use Piazza.PubSub.Consumer,
    broadcaster: Console.PubSub.Broadcaster,
    max_demand: 10
  alias Console.AI.PubSub.{Vectorizable, Vector.Indexable}
  alias Console.AI.VectorStore
  require Logger

  def handle_event(event) do
    case VectorStore.enabled?() do
      true -> Vectorizable.resource(event) |> insert()
      _ -> :ok
    end
  end

  defp insert(%Indexable{data: resources, filters: fs}) when is_list(resources),
    do: Enum.each(resources, &VectorStore.insert(&1, filters: fs))
  defp insert(%Indexable{data: res, filters: fs}), do: VectorStore.insert(res, filters: fs)
  defp insert(pass), do: pass
end
