defmodule Console.Schema.Changelog do
  use Piazza.Ecto.Schema
  alias Console.Schema.{Build}

  schema "changelog" do
    field :repo,     :string
    field :tool,     :string
    field :content,  :string

    belongs_to :build, Build

    timestamps()
  end

  @valid ~w(repo tool content build_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> foreign_key_constraint(:build_id)
    |> unique_constraint([:build_id, :repo, :tool])
    |> validate_required([:repo, :tool, :build_id])
  end
end
