defmodule Console.GraphQl.Helpers do
  def resolve_changeset(%Ecto.Changeset{changes: %{} = changes, errors: errors}) when is_list(errors) do
    Enum.map(errors, fn
      {field, {msg, _}} -> "#{field} #{msg}"
    end)
    |> Enum.concat(resolve_changeset(changes))
  end
  def resolve_changeset(%{} = changes), do: Enum.flat_map(changes, fn {_, cs} -> resolve_changeset(cs) end)
  def resolve_changeset(l) when is_list(l), do: Enum.flat_map(l, &resolve_changeset/1)
  def resolve_changeset(_), do: []
end
