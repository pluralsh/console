defmodule Console.GraphQl.CustomTypes do
  use Absinthe.Schema.Notation
  alias Absinthe.Blueprint

  scalar :map, name: "Map" do
    serialize &mapish/1
    parse fn
      %Blueprint.Input.String{value: value}, _ ->
        with {:error, _} <- Jason.decode(value),
          do: {:error, "invalid json encoding"}
      %Blueprint.Input.Null{}, _ -> {:ok, nil}
      _, _ -> :error
    end
  end

  scalar :json, name: "Json" do
    serialize &mapish/1
    parse fn
      %Blueprint.Input.String{value: value}, _ ->
        with {:error, _} <- Jason.decode(value),
          do: {:error, "invalid json encoding"}
      %Blueprint.Input.Null{}, _ -> {:ok, nil}
      _, _ -> :error
    end
  end

  scalar :long, name: "Long" do
    serialize &Integer.to_string/1
    parse fn
      %Blueprint.Input.String{value: value} ->
        parse_int(value)
      %Blueprint.Input.Null{} -> {:ok, nil}
      _ -> :error
    end
  end

  scalar :intish, name: "Intish" do
    serialize fn
      %Decimal{} = d -> Decimal.to_integer(d)
      v when is_integer(v) -> v
      _ -> :error
    end

    parse fn
      %Blueprint.Input.Integer{value: v} -> {:ok, v}
      _ -> :error
    end
  end

  defp mapish(m) when is_map(m), do: m
  defp mapish(m) when is_binary(m), do: Jason.decode!(m)
  defp mapish(_), do: :error

  defp parse_int(int) do
    case Integer.parse(int) do
      {val, _} -> {:ok, val}
      error -> error
    end
  end
end
