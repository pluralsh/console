defmodule Console.PubSub.Consumers.Cache do
  @moduledoc nil
  use Console.PubSub.Consumer,
    broadcaster: Console.PubSub.Broadcaster,
    max_demand: 10,
    protocol: Console.PubSub.Cacheable

  def handle_event(event) do
    with {action, key, item} <- Console.PubSub.Cacheable.cache(event) do
      handle_cache(action, key, item)
    end
  end

  defp handle_cache(act, [_ | _] = l, [_ | _] = l2) do
    Enum.zip(l, l2)
    |> Enum.map(fn {k, i} -> handle_cache(act, k, i) end)
  end
  defp handle_cache(:set, key, item), do: Console.Cache.put(key, item)
  defp handle_cache(:del, key, _), do: Console.Cache.delete(key)
end
