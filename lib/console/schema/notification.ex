defmodule Console.Schema.Notification do
  use Piazza.Ecto.Schema

  schema "notifications" do
    field :title,       :string
    field :description, :string
    field :repository,  :string
    field :labels,      :map
    field :annotations, :map
    field :fingerprint,  :string
    field :seen_at,     :utc_datetime_usec

    timestamps()
  end

  def ordered(query \\ __MODULE__, order \\ [desc: :seen_at]) do
    from(n in query, order_by: ^order)
  end

  @valid ~w(title description repository labels annotations fingerprint seen_at)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> unique_constraint(:fingerprint)
    |> validate_required([:title, :description, :repository, :seen_at, :fingerprint])
  end
end
