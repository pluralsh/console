defmodule Console.Deployments.Stacks.Stability do
  def stabilize(attrs, stack) do
    dedupe(attrs, :environment, stack)
    |> dedupe(:files, stack, :path)
  end

  defp dedupe(attrs, key, stack, dupe_key \\ :name) do
    current = Map.get(stack, key) |> Map.new(& {Map.get(&1, dupe_key), &1})
    case attrs do
      %{^key => [_ | _] = res} ->
        Map.put(attrs, key, Enum.map(res, &backfill_id(&1, current, dupe_key)))
      _ -> attrs
    end
  end

  defp backfill_id(%{} = val, prev, dupe_key) do
    case Map.get(prev, Map.get(val, dupe_key)) do
      %{id: id} -> Map.put(val, :id, id)
      _ -> val
    end
  end
  defp backfill_id(val, _, _), do: val
end
