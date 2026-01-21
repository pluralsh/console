defmodule Console.OpenAPI.Base do
  import JSV.Schema.Helpers

  defmacro __using__(_opts) do
    quote do
      use JSV.Schema
      import Console.OpenAPI.Base

      def wire_format(%{} = struct), do: to_wire(struct, json_schema())
      def wire_format(l) when is_list(l) do
        schema = json_schema()
        %{data: Enum.map(l, &to_wire(&1, schema))}
      end

      defp to_wire(%{} = map, %{properties: props}) do
        Enum.reduce(props, %{}, fn {k, v}, acc ->
          case Map.get(map, k) do
            nil -> acc
            value -> Map.put(acc, k, to_wire(value, v))
          end
        end)
      end
      defp to_wire(%{} = map, {:__optional__, module, _}) when is_atom(module), do: to_wire(map, module.json_schema())
      defp to_wire(%{} = map, {module, _}) when is_atom(module), do: to_wire(map, module.json_schema())
      defp to_wire(%{} = map, module) when is_atom(module), do: to_wire(map, module.json_schema())
      defp to_wire(l, %{items: items}), do: Enum.map(l, &to_wire(&1, items))
      defp to_wire(v, _), do: v
    end
  end

  def timestamps(props), do: Map.merge(props, %{inserted_at: datetime(), updated_at: datetime()})

  def ecto_enum(type) do
    type.__enum_map__()
    |> Enum.map(fn {key, _} -> key end)
    |> string_enum_to_atom()
  end
end
