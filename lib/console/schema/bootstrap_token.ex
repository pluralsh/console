defmodule Console.Schema.BootstrapToken do
  use Piazza.Ecto.Schema
  alias Console.Schema.{User, Project}

  schema "bootstrap_tokens" do
    field :token,        :string

    belongs_to :user,    User
    belongs_to :project, Project

    timestamps()
  end

  @valid ~w(user_id project_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> foreign_key_constraint(:user_id)
    |> foreign_key_constraint(:project_id)
    |> put_new_change(:token, fn -> "plrl-edge-#{Console.rand_alphanum(30)}" end)
    |> validate_required([:token | @valid])
  end
end
