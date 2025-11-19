defmodule Console.AI.PubSub.Vector.Consumer do
  use Piazza.PubSub.Consumer,
    broadcaster: Console.PubSub.Broadcaster,
    max_demand: 200
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

  def insert(l) when is_list(l), do: Enum.each(l, &insert(&1))
  def insert(%Indexable{data: resources} = indexable) when is_list(resources) do
    Console.throttle(resources, count: 10, pause: 200)
    |> Enum.each(&insert(%{indexable | data: &1}))
  end

  def insert(%Indexable{delete: true, force: true, filters: fs}), do: VectorStore.delete(filters: fs)
  def insert(%Indexable{delete: true, filters: fs}) do
    Console.debounce({:vectorizer, :erlang.phash2({fs, :delete})}, fn ->
      VectorStore.delete(filters: fs)
    end)
  end

  def insert(%Indexable{data: res, filters: fs, force: true}), do: VectorStore.insert(res, filters: fs)
  def insert(%Indexable{data: res, filters: fs}) do
    Console.debounce({:vectorizer, :erlang.phash2({res, fs})}, fn ->
      VectorStore.insert(res, filters: fs)
    end)
  end

  def insert(pass), do: pass
end
