defmodule Console.AI.Tools.Pra.Commit do
  use Ecto.Schema
  import Ecto.Changeset

  @type t :: %__MODULE__{
    title: binary,
    message: binary
  }

  embedded_schema do
    field :title, :string
    field :message, :string
  end

  @schema Console.priv_file!("tools/pra/commit.json") |> Jason.decode!()

  def name(_), do: "commit"
  def description(_), do: "Commits the changes to the repository and creates a pull request using the provided title and message"
  def json_schema(_), do: @schema

  @valid ~w(title message)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> validate_required(@valid)
  end

  def implement(_, %__MODULE__{} = commit), do: {:ok, commit}
end
