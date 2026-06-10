defmodule Console.AI.Tools.Workbench.Integration.Query do
  @moduledoc false

  def query_string(%{} = params) when map_size(params) == 0, do: ""

  def query_string(%{} = params),
    do: "?" <> URI.encode_query(stringify_params(params), :rfc3986)

  def query_string(_), do: ""

  def stringify_params(map) do
    map
    |> Enum.reject(fn {_, v} -> is_nil(v) end)
    |> Enum.map(fn {k, v} -> {param_key(k), v} end)
    |> Map.new()
  end

  defp param_key(k) when is_atom(k), do: Atom.to_string(k)
  defp param_key(k) when is_binary(k), do: k
end
