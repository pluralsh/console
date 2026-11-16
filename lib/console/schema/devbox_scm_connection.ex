defmodule Console.Schema.DevboxScmConnection do
  use Console.Schema.Base
  alias Console.Schema.{Devbox, ScmConnection}

  schema "devbox_scm_connections" do
    belongs_to :devbox,     Devbox
    belongs_to :connection, ScmConnection

    timestamps()
  end

  @valid ~w(devbox_id connection_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> foreign_key_constraint(:connection_id)
    |> unique_constraint([:devbox_id, :connection_id])
    |> validate_required([:connection_id])
  end
end
