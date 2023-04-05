defmodule Console.Utils.Path do
  require Elixpath.PathComponent, as: PathComponent

  def parse(v, :string), do: v
  def parse(v, :int), do: String.to_integer(v)
  def parse(v, :float), do: String.to_float(v)
  def parse("true", :bool), do: true
  def parse("false", :bool), do: false

  def update(m, p, {v, t}) when t in ~w(string int float bool)a, do: update(m, p, parse(v, t))
  def update(map, path, value) when is_binary(path) do
    with {:ok, spec} <- Elixpath.Parser.parse(path),
      do: update(map, spec, value)
  end

  def update(struct, %Elixpath{path: [PathComponent.child(key)]}, value), do: do_update(struct, key, value)

  def update(struct, %Elixpath{path: [PathComponent.child(key) | rest]}, value) do
    with {:ok, next} <- fetch(struct, key),
         {:ok, val} <- update(next, %Elixpath{path: rest}, value),
      do: do_update(struct, key, val)
  end

  defp do_update(l, k, v) when is_list(l) and is_integer(k), do: {:ok, List.replace_at(l, k, v)}
  defp do_update(m, k, v) when is_map(m), do: {:ok, Map.put(m, k, v)}
  defp do_update(_, k, _), do: {:error, "could not update #{inspect(k)}"}

  defp fetch(l, k) when is_list(l) and is_integer(k), do: {:ok, Enum.at(l, k)}
  defp fetch(m, k) when is_map(m), do: {:ok, Map.get(m, k)}
  defp fetch(_, _), do: {:error, "could not probe structure"}
end
