defmodule Console.Schema.ChatThread do
  use Piazza.Ecto.Schema
  alias Console.Schema.{User, Chat}

  @max_threads 50

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

  def prunable(query \\ __MODULE__) do
    query = with_cte(query, "numbered_threads", as: ^numbered_threads(query))
    expired = Timex.now() |> Timex.shift(days: -1)

    from(t in query,
      join: nt in "numbered_threads",
        on: nt.id == t.id,
      where: nt.row_number > @max_threads and t.inserted_at <= ^expired
    )
  end

  def numbered_threads(query \\ __MODULE__) do
    from(t in query,
      select: %{id: t.id, inserted_at: t.inserted_at, row_number: fragment("ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY inserted_at DESC)")}
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
    |> unique_constraint(:user_id, name: :chat_threads_user_id_uniq_index)
    |> validate_required([:user_id])
  end
end
