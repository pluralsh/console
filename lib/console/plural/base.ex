defmodule Console.Plural.Base do
  defmacro __using__(_) do
    quote do
      import Console.Plural.Base
      import Console.Plural.Queries
      alias Console.Plural.Client
    end
  end

  def prune_variables(map) do
    Enum.filter(map, fn {_, v} -> not is_nil(v) end)
    |> Enum.into(%{})
  end
end
