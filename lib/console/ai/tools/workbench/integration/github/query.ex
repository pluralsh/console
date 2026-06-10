defmodule Console.AI.Tools.Workbench.Integration.Github.Query do
  @moduledoc false

  alias Console.AI.Tools.Workbench.Integration.Query, as: SharedQuery

  @default_page 1
  @default_per_page 30

  def qp(params), do: SharedQuery.query_string(params)

  def paginated(params) do
    params
    |> Map.put_new(:page, @default_page)
    |> Map.put_new(:per_page, @default_per_page)
  end

  def manual_pagination(), do: [pagination: :manual]

  def normalize_head(%{owner: owner, head: head}) when is_binary(owner) and is_binary(head) do
    case String.trim(head) do
      "" ->
        nil

      normalized ->
        if String.contains?(normalized, ":"), do: normalized, else: "#{owner}:#{normalized}"
    end
  end

  def normalize_head(%{head: head}), do: head

  def stringify_params(map) do
    SharedQuery.stringify_params(map)
  end

  def merge_optional(base, source, keys) do
    Enum.reduce(keys, base, fn key, acc ->
      case Map.get(source, key) do
        nil -> acc
        v -> Map.put(acc, key, v)
      end
    end)
  end
end
