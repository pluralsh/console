defmodule Console.AI.Tools.Workbench.Integration.Github.Query do
  @moduledoc false

  def qp(params) when map_size(params) == 0, do: ""
  def qp(params), do: "?" <> URI.encode_query(params, :safe)

  def stringify_params(map) do
    map
    |> Enum.reject(fn {_, v} -> is_nil(v) end)
    |> Enum.map(fn {k, v} -> {param_key(k), v} end)
    |> Map.new()
  end

  defp param_key(k) when is_atom(k), do: k |> Atom.to_string()
  defp param_key(k) when is_binary(k), do: k

  def merge_optional(base, source, keys) do
    Enum.reduce(keys, base, fn key, acc ->
      case Map.get(source, key) do
        nil -> acc
        v -> Map.put(acc, key, v)
      end
    end)
  end
end
