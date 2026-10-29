defmodule ConsoleWeb.Params do
  @moduledoc """
  Strong-params style filtering of decoded JSON for controllers that hand it straight to changesets.

  Only keys named in the spec are kept, converted to atoms, and a nested spec applies to an object or
  list of objects under that key. Values are otherwise left as is for the changesets to validate.
  """

  @type spec :: [atom | {atom, spec}]

  @spec permit(term, spec) :: term
  def permit(params, spec) when is_list(params), do: Enum.map(params, &permit(&1, spec))
  def permit(%{} = params, spec) do
    Enum.reduce(spec, %{}, fn
      {key, nested}, acc -> put_permitted(acc, params, key, &permit(&1, nested))
      key, acc -> put_permitted(acc, params, key, & &1)
    end)
  end
  def permit(value, _), do: value

  defp put_permitted(acc, params, key, fun) do
    case Map.fetch(params, Atom.to_string(key)) do
      {:ok, value} -> Map.put(acc, key, fun.(value))
      :error -> acc
    end
  end
end
