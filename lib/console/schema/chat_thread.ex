defmodule Console.Schema.ChatThread do
  use Piazza.Ecto.Schema
  alias Console.Schema.{User, Chat}

  schema "chat_threads" do
    field :summary,    :string
    field :default,    :boolean, default: false
    field :summarized, :boolean, default: false

    belongs_to :user, User

    timestamps()
  end

  def with_expired_chats(query \\ __MODULE__) do
    from(t in query,
      left_join: c in ^Chat.expired(),
        on: c.thread_id == t.id,
      where: not is_nil(c.id),
      distinct: true
    )
  end

  def unsummarized(query \\ __MODULE__) do
    from(t in query, where: is_nil(t.summarized) or not t.summarized)
  end

  def default(query \\ __MODULE__) do
    from(t in query, where: t.default)
  end

  def for_user(query \\ __MODULE__, user_id) do
    from(t in query, where: t.user_id == ^user_id)
  end

  def ordered(query \\ __MODULE__, order \\ [desc: :inserted_at]) do
    from(t in query, order_by: ^order)
  end

  @valid ~w(summary summarized default user_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> foreign_key_constraint(:user_id)
    |> validate_required([:user_id])
  end
end
