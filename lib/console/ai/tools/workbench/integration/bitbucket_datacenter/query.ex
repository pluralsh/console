defmodule Console.AI.Tools.Workbench.Integration.BitbucketDatacenter.Query do
  @moduledoc false

  def merge_optional(base, source, keys) do
    Enum.reduce(keys, base, fn key, acc ->
      case Map.get(source, key) do
        nil -> acc
        v -> Map.put(acc, key, v)
      end
    end)
  end
end
