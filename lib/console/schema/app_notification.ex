defmodule Console.Schema.AppNotification do
  use Piazza.Ecto.Schema
  alias Console.Schema.{User}

  defenum Priority, low: 0, medium: 1, high: 2

  schema "app_notifications" do
    field :priority, Priority, default: :low
    field :text,     :string
    field :read_at,  :utc_datetime_usec

    belongs_to :user, User

    timestamps()
  end

  def for_user(query \\ __MODULE__, user_id) do
    from(n in query, where: n.user_id == ^user_id)
  end

  def unread(query \\ __MODULE__) do
    from(n in query, where: is_nil(n.read_at))
  end

  def ordered(query \\ __MODULE__, order \\ [desc: :inserted_at]) do
    from(n in query, order_by: ^order)
  end

  def expired(query \\ __MODULE__) do
    expiry = Timex.now() |> Timex.shift(days: -7)

    from(n in query, where: not is_nil(n.read_at) and n.read_at < ^expiry)
  end

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, ~w(user_id text priority)a)
    |> foreign_key_constraint(:user_id)
    |> validate_required(~w(user_id text)a)
  end
end
