defmodule Console.AI.PubSub.Vector.Consumer do
  use Piazza.PubSub.Consumer,
    broadcaster: Console.PubSub.Broadcaster,
    max_demand: 10
  alias Console.AI.PubSub.{Vectorizable, Vector.Indexable}
  alias Console.AI.VectorStore
  require Logger

  def handle_event(event) do
    case VectorStore.enabled?() do
      true ->
        Vectorizable.resource(event)
        |> insert()
      _ -> :ok
    end
  end

  defp insert(l) when is_list(l), do: Enum.each(l, &insert(&1))
  defp insert(%Indexable{data: resources, filters: fs}) when is_list(resources) do
    Console.throttle(resources, count: 10, pause: 200)
    |> Enum.each(&VectorStore.insert(&1, filters: fs))
  end
  defp insert(%Indexable{delete: true, filters: fs}), do: VectorStore.delete(filters: fs)
  defp insert(%Indexable{data: res, filters: fs}), do: VectorStore.insert(res, filters: fs)
  defp insert(pass), do: pass
end
