defmodule Console.Logs.Provider.Utils do
  def facets(%{} = map) do
    Enum.map(map, fn {k, v} -> %{key: k, value: v} end)
  end
  def facets(_), do: nil
end
