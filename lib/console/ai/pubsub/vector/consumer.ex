defmodule Console.AI.PubSub.Vector.Consumer do
  use Console.PubSub.Consumer,
    broadcaster: Console.PubSub.Broadcaster,
    max_demand: 200,
    protocol: Console.AI.PubSub.Vectorizable
  import Console.Schema.WorkbenchJob, only: [is_terminal: 1]
  alias Console.AI.PubSub.{Vectorizable, Vector.Indexable}
  alias Console.AI.VectorStore
  alias Console.Schema.WorkbenchJob
  require Logger

  def select?(%Console.PubSub.WorkbenchJobUpdated{item: %WorkbenchJob{status: s}}) when not is_terminal(s), do: false
  def select?(event), do: super(event)

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
    end, ttl: :timer.hours(5))
  end

  def insert(pass), do: pass
end
