defmodule Watchman.Schema.Lock do
  use Piazza.Ecto.Schema

  schema "locks" do
    field :name,       :string
    field :holder,     :binary_id
    field :expires_at, :utc_datetime_usec

    timestamps()
  end

  def active(query \\ __MODULE__) do
    now = Timex.now()
    from(l in query, where: l.expires_at > ^now, lock: "FOR UPDATE")
  end

  @valid ~w(name holder expires_at)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> unique_constraint(:name)
    |> validate_required([:name, :holder, :expires_at])
  end
end