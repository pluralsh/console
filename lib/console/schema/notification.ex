defmodule Console.Schema.Notification do
  use Piazza.Ecto.Schema

  defenum Severity, none: 0, low: 1, medium: 2, high: 3, critical: 4
  defenum Status, firing: 0, resolved: 1

  schema "notifications" do
    field :title,       :string
    field :description, :string
    field :repository,  :string
    field :status,      Status
    field :labels,      :map
    field :annotations, :map
    field :fingerprint, :string
    field :seen_at,     :utc_datetime_usec
    field :severity,    Severity

    timestamps()
  end

  def expired(query \\ __MODULE__) do
    expired = DateTime.utc_now() |> Timex.shift(days: -30)
    from(i in query, where: i.inserted_at < ^expired)
  end

  def unread(query \\ __MODULE__, user)
  def unread(query, %{read_timestamp: nil}), do: query
  def unread(query, %{read_timestamp: ts}) do
    from(n in query, where: coalesce(n.updated_at, n.inserted_at) > ^ts)
  end

  def ordered(query \\ __MODULE__, order \\ [desc: :seen_at]) do
    from(n in query, order_by: ^order)
  end

  @valid ~w(title description repository labels annotations fingerprint seen_at severity status)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> unique_constraint(:fingerprint)
    |> validate_required([:title, :description, :repository, :seen_at, :fingerprint])
    |> validate_length(:title, max: 1000)
    |> validate_length(:description, max: 10_000)
  end
end
