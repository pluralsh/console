defmodule Console.Schema.Leader do
  use Piazza.Ecto.Schema

  schema "leaders" do
    field :name,      :string
    field :ref,       Piazza.Ecto.Types.Erlang
    field :heartbeat, :utc_datetime_usec

    timestamps()
  end

  def with_lock(query \\ __MODULE__) do
    from(l in query, lock: "FOR UPDATE")
  end

  @valid ~w(name ref heartbeat)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> unique_constraint(:name)
    |> validate_required(@valid)
  end
end
