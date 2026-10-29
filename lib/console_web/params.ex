defmodule ConsoleWeb.Params do
  @moduledoc """
  Strong-params style handling of decoded JSON for controllers that hand it straight to the data layer.

  `permit/2` keeps only the keys named in a spec, converted to atoms, leaving values for changesets to
  validate. `cast_all/3` additionally casts values to a schema's field types, for data that's inserted
  without a changeset.
  """

  @type spec :: [atom | {atom, spec}]
  @type error :: {:error, Ecto.Changeset.t | {:bad_request, binary}}

  @spec permit(term, spec) :: term
  def permit(params, spec) when is_list(params), do: Enum.map(params, &permit(&1, spec))
  def permit(%{} = params, spec) do
    Enum.reduce(spec, %{}, fn
      {key, nested}, acc -> put_permitted(acc, params, key, &permit(&1, nested))
      key, acc -> put_permitted(acc, params, key, & &1)
    end)
  end
  def permit(value, _), do: value

  @doc """
  Casts each object in `rows` to the types of `schema`'s fields, keeping only the given fields the schema has.
  Null and missing values are left out.
  """
  @spec cast_all([map] | nil, module, [atom]) :: {:ok, [map] | nil} | error
  def cast_all(nil, _, _), do: {:ok, nil}
  def cast_all(rows, schema, fields) when is_list(rows) do
    types = Map.new(fields, &{&1, schema.__schema__(:type, &1)}) |> Map.reject(fn {_, t} -> is_nil(t) end)
    Enum.reduce_while(rows, {:ok, []}, fn
      %{} = row, {:ok, acc} ->
        Ecto.Changeset.cast({%{}, types}, row, Map.keys(types))
        |> Ecto.Changeset.apply_action(:insert)
        |> case do
          {:ok, row} -> {:cont, {:ok, [row | acc]}}
          err -> {:halt, err}
        end
      _, _ -> {:halt, {:error, {:bad_request, "expected a list of objects"}}}
    end)
    |> case do
      {:ok, rows} -> {:ok, Enum.reverse(rows)}
      err -> err
    end
  end
  def cast_all(_, _, _), do: {:error, {:bad_request, "expected a list of objects"}}

  @doc """
  Ensures every item is an object with string values for `keys`, as the data layer pattern matches on them.
  """
  @spec require_keys([term], [atom]) :: {:ok, [map]} | error
  def require_keys(items, keys) do
    case Enum.all?(items, fn item -> is_map(item) && Enum.all?(keys, &is_binary(item[&1])) end) do
      true -> {:ok, items}
      false -> {:error, {:bad_request, "every item requires #{Enum.join(keys, ", ")}"}}
    end
  end

  defp put_permitted(acc, params, key, fun) do
    case Map.fetch(params, Atom.to_string(key)) do
      {:ok, value} -> Map.put(acc, key, fun.(value))
      :error -> acc
    end
  end
end
