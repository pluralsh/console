defmodule Console.GraphQl.Helpers do
  def resolve_changeset(%Ecto.Changeset{errors: errors}) do
    Enum.map(errors, fn {field, {msg, _}} -> "#{field} #{msg}" end)
  end
end
