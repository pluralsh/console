defmodule Console.AI.Tools.Pra.Edit do
  use Ecto.Schema
  import Ecto.Changeset
  import Console.AI.Tools.Pra.Utils
  alias Console.AI.File.Editor

  embedded_schema do
    field :dir, :string, virtual: true
    field :path, :string
    field :previous, :string
    field :replacement, :string
  end

  def name(_), do: "edit"
  def description(_), do: "Edits the contents of a file at the given path by replacing the previous content with replacement content"
  def json_schema(_), do: Console.priv_file!("tools/pra/edit.json") |> Jason.decode!()

  @valid ~w(path previous replacement)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> validate_required([:path, :previous, :replacement])
  end

  def implement(_, %__MODULE__{dir: dir, path: path, previous: previous, replacement: replacement}) do
    with {:ok, path} <- relpath(dir, path),
      do: Editor.replace(path, previous, replacement)
  end
end
