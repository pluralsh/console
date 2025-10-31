defmodule Console.Schema.ChatThread do
  use Piazza.Ecto.Schema
  alias Console.Schema.{User, Chat, AiInsight, Flow, AgentSession}

  @max_threads 50

  @expiry [days: -7]

  schema "chat_threads" do
    field :summary,    :string
    field :default,    :boolean, default: false
    field :summarized, :boolean, default: false

    field :last_message_at, :utc_datetime_usec

    embeds_one :settings, Settings, on_replace: :update do
      field :memory, :boolean, default: true
    end

    belongs_to :user, User
    belongs_to :insight, AiInsight
    belongs_to :flow, Flow

    has_one :session, AgentSession,
      on_replace: :update,
      foreign_key: :thread_id

    timestamps()
  end

  def search(query \\ __MODULE__, q) do
    from(t in query, where: fragment("encode(?, 'escape') ILIKE ?", t.summary, ^"%#{q}%"))
  end

  def settings(%__MODULE__{settings: %{memory: m}}, :memory) when is_boolean(m), do: m
  def settings(_, _), do: false

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
    too_old = Timex.now() |> Timex.shift(@expiry)

    from(t in query,
      join: nt in "numbered_threads",
        on: nt.id == t.id,
      where: (nt.row_number > @max_threads and t.inserted_at <= ^expired) or
             (not is_nil(t.last_message_at) and t.last_message_at < ^too_old) or
             (is_nil(t.last_message_at) and t.inserted_at < ^too_old)
    )
  end

  def numbered_threads(query \\ __MODULE__) do
    from(t in query,
      select: %{
        id: t.id,
        inserted_at: t.inserted_at,
        row_number: fragment("ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY inserted_at DESC)")
      }
    )
  end

  def nonagent(query \\ __MODULE__) do
    from(t in query,
      left_join: s in assoc(t, :session),
        where: is_nil(s.id) or is_nil(s.type) or s.type not in ^[:terraform, :kubernetes]
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

  def for_flow(query \\ __MODULE__, flow_id) do
    from(t in query, where: t.flow_id == ^flow_id)
  end

  def ordered(query \\ __MODULE__, order \\ [desc: :inserted_at]) do
    from(t in query, order_by: ^order)
  end

  @valid ~w(summary last_message_at summarized default user_id flow_id insight_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> cast_embed(:settings, with: &settings_changeset/2)
    |> cast_assoc(:session)
    |> foreign_key_constraint(:user_id)
    |> foreign_key_constraint(:insight_id)
    |> foreign_key_constraint(:flow_id)
    |> unique_constraint(:user_id, name: :chat_threads_user_id_uniq_index)
    |> validate_required([:user_id])
  end

  defp settings_changeset(model, attrs) do
    model
    |> cast(attrs, [:memory])
    |> validate_required([:memory])
  end
end
