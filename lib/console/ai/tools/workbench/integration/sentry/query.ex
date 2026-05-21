defmodule Console.AI.Tools.Workbench.Integration.Sentry.Query do
  @moduledoc false

  def merge_optional(base, source, keys) do
    Enum.reduce(keys, base, fn key, acc ->
      case Map.get(source, key) do
        nil -> acc
        v -> Map.put(acc, key, v)
      end
    end)
  end

  def enc(segment) when is_binary(segment), do: URI.encode(segment, &URI.char_unreserved?/1)
  def enc(segment), do: segment |> to_string() |> enc()
end
