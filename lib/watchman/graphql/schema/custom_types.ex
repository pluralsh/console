defmodule Watchman.GraphQl.CustomTypes do
  use Absinthe.Schema.Notation
  alias Absinthe.Blueprint

  scalar :map, name: "Map" do
    serialize &mapish/1
    parse &mapish/1
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

  defp mapish(m) when is_map(m), do: m
  defp mapish(_), do: :error

  defp parse_int(int) do
    case Integer.parse(int) do
      {val, _} -> {:ok, val}
      error -> error
    end
  end
end