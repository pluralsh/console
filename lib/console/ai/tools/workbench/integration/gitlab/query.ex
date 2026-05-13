defmodule Console.AI.Tools.Workbench.Integration.Gitlab.Query do
  @moduledoc false

  def merge_optional(base, source, keys) do
    Enum.reduce(keys, base, fn key, acc ->
      case Map.get(source, key) do
        nil -> acc
        v -> Map.put(acc, key, v)
      end
    end)
  end

  def stringify_params(map) do
    map
    |> Enum.reject(fn {_, v} -> is_nil(v) end)
    |> Enum.map(fn {k, v} -> {to_string(k), v} end)
    |> Map.new()
  end
end
