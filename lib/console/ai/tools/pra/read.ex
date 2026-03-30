defmodule Console.AI.Tools.Pra.Read do
  use Ecto.Schema
  import Ecto.Changeset
  import Console.AI.Tools.Pra.Utils

  embedded_schema do
    field :dir, :string, virtual: true
    field :path, :string
  end

  @schema Console.priv_file!("tools/pra/read.json") |> Jason.decode!()

  def name(_), do: "read"
  def description(_), do: "Reads the contents of a file at the given path"
  def json_schema(_), do: @schema

  @valid ~w(path)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> validate_required([:path])
  end

  def implement(_, %__MODULE__{dir: dir, path: path}) do
    with {:ok, path} <- relpath(dir, path) do
      File.read(path)
    end
  end
end
